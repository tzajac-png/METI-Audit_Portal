import {
  DEFAULT_GID_INSTRUCTOR_UPLOAD_FORM,
  fetchSheetTable,
} from "@/lib/google-sheet";
import type { InstructorDirectoryRow } from "@/lib/instructor-directory";
import {
  pickInstructorEmail,
  pickInstructorName,
} from "@/lib/instructor-id";
import { normalizeEmail } from "@/lib/directory-helpers";
import { mapDocumentTypeToCategory } from "@/lib/instructor-document-type-map";
import type { InstructorUploadCategory } from "@/lib/instructor-uploads-store";

export type InstructorFormSubmission = {
  /** Stable id for React keys */
  id: string;
  timestamp: string;
  instructorField: string;
  documentType: string;
  expirationDate: string;
  documentUrl: string;
};

function collapseWs(s: string): string {
  return s
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

function normalizePersonKey(s: string): string {
  return collapseWs(s).toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

/** Whether a form row's "Instructor" value matches this roster person. */
export function formInstructorMatchesPerson(
  formInstructor: string,
  person: InstructorDirectoryRow,
): boolean {
  const f = normalizePersonKey(formInstructor);
  if (!f) return false;
  const name = normalizePersonKey(pickInstructorName(person));
  const email = normalizeEmail(pickInstructorEmail(person));
  if (email && f === email) return true;
  if (name && f === name) return true;
  const nameSorted = name.split(" ").filter(Boolean).sort().join(" ");
  const formSorted = f.split(" ").filter(Boolean).sort().join(" ");
  if (nameSorted && nameSorted === formSorted) return true;
  if (name && (f.includes(name) || name.includes(f))) return true;
  return false;
}

function isDebugHeader(h: string): boolean {
  return /^debug/i.test(h.trim());
}

function findHeaderIndex(headers: string[], re: RegExp): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.trim() ?? "";
    if (isDebugHeader(h)) continue;
    if (re.test(h)) return i;
  }
  return -1;
}

function firstHeaderIndex(headers: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = findHeaderIndex(headers, re);
    if (i >= 0) return i;
  }
  return -1;
}

function cellAt(cells: string[], idx: number): string {
  if (idx < 0 || idx >= cells.length) return "";
  return collapseWs(cells[idx] ?? "");
}

/** First HTTPS URL anywhere in the row (Google Forms sometimes move link column). */
function firstHttpUrlInRow(cells: string[]): string {
  for (const c of cells) {
    const t = collapseWs(c);
    if (/^https?:\/\//i.test(t)) return t;
  }
  return "";
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function stableRowId(parts: string[]): string {
  const t = parts.join("|").slice(0, 200);
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) | 0;
  }
  return `form-${Math.abs(h).toString(36)}`;
}

type ColumnMap = {
  timestamp: number;
  instructor: number;
  documentType: number;
  expiration: number;
  upload: number;
};

function resolveColumns(headers: string[]): ColumnMap {
  const timestamp = firstHeaderIndex(headers, [
    /^timestamp$/i,
    /time\s*stamp/i,
  ]);
  const instructor = firstHeaderIndex(headers, [
    /^instructor$/i,
    /^instructor\s+name$/i,
    /instructor/i,
  ]);
  const documentType = firstHeaderIndex(headers, [
    /document\s*type/i,
    /^type$/i,
  ]);
  const expiration = firstHeaderIndex(headers, [
    /expiration/i,
    /expiry|expires/i,
  ]);
  const upload = firstHeaderIndex(headers, [
    /upload\s*document/i,
    /uploaded\s*files?/i,
    /file\s*upload/i,
    /drive\s*link|document\s*link/i,
    /^upload$/i,
    /upload|attachment|file|link/i,
  ]);

  return {
    timestamp,
    instructor,
    documentType,
    expiration,
    upload,
  };
}

export async function fetchInstructorFormSubmissions(): Promise<{
  submissions: InstructorFormSubmission[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid =
    process.env.GOOGLE_SHEET_GID_INSTRUCTOR_UPLOAD_FORM?.trim() ??
    DEFAULT_GID_INSTRUCTOR_UPLOAD_FORM;
  const { headers, rawRowCells, sourceUrl } = await fetchSheetTable(gid);
  const col = resolveColumns(headers);
  const submissions: InstructorFormSubmission[] = [];

  for (const cells of rawRowCells) {
    const timestamp =
      col.timestamp >= 0 ? cellAt(cells, col.timestamp) : "";
    const instructorField =
      col.instructor >= 0 ? cellAt(cells, col.instructor) : "";
    const documentType =
      col.documentType >= 0 ? cellAt(cells, col.documentType) : "";
    const expirationDate =
      col.expiration >= 0 ? cellAt(cells, col.expiration) : "";

    let documentUrl =
      col.upload >= 0 ? cellAt(cells, col.upload) : "";
    if (!isHttpUrl(documentUrl)) {
      documentUrl = firstHttpUrlInRow(cells);
    }

    if (!instructorField || !documentType || !isHttpUrl(documentUrl)) continue;

    submissions.push({
      id: stableRowId([timestamp, instructorField, documentType, documentUrl]),
      timestamp,
      instructorField,
      documentType,
      expirationDate,
      documentUrl: documentUrl.trim(),
    });
  }

  return {
    submissions,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}

export function filterSubmissionsForPerson(
  submissions: InstructorFormSubmission[],
  person: InstructorDirectoryRow,
): InstructorFormSubmission[] {
  return submissions.filter((s) =>
    formInstructorMatchesPerson(s.instructorField, person),
  );
}

export type GroupedFormSubmissions = {
  byCategory: Partial<Record<InstructorUploadCategory, InstructorFormSubmission[]>>;
  unmapped: InstructorFormSubmission[];
};

export function groupFormSubmissionsByCategory(
  list: InstructorFormSubmission[],
): GroupedFormSubmissions {
  const byCategory: Partial<
    Record<InstructorUploadCategory, InstructorFormSubmission[]>
  > = {};
  const unmapped: InstructorFormSubmission[] = [];

  const sorted = [...list].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return b.timestamp.localeCompare(a.timestamp);
  });

  for (const s of sorted) {
    const cat = mapDocumentTypeToCategory(s.documentType);
    if (cat) {
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat]!.push(s);
    } else {
      unmapped.push(s);
    }
  }

  return { byCategory, unmapped };
}
