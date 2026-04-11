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

function normalizePersonKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function cellExact(row: Record<string, string>, canonical: string): string {
  const want = canonical.trim().toLowerCase();
  for (const [k, v] of Object.entries(row)) {
    if (/^debug/i.test(k.trim())) continue;
    if (k.trim().toLowerCase() === want) return (v ?? "").trim();
  }
  return "";
}

function pickCell(row: Record<string, string>, headerRe: RegExp): string {
  for (const [k, v] of Object.entries(row)) {
    if (/^debug/i.test(k.trim())) continue;
    if (headerRe.test(k.trim())) return (v ?? "").trim();
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

export async function fetchInstructorFormSubmissions(): Promise<{
  submissions: InstructorFormSubmission[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid =
    process.env.GOOGLE_SHEET_GID_INSTRUCTOR_UPLOAD_FORM?.trim() ??
    DEFAULT_GID_INSTRUCTOR_UPLOAD_FORM;
  const { rows, sourceUrl } = await fetchSheetTable(gid);
  const submissions: InstructorFormSubmission[] = [];

  for (const row of rows) {
    const timestamp =
      cellExact(row, "Timestamp") || pickCell(row, /^timestamp$/i);
    const instructorField =
      cellExact(row, "Instructor") || pickCell(row, /^instructor$/i);
    const documentType =
      cellExact(row, "Document Type") || pickCell(row, /^document type$/i);
    const expirationDate =
      cellExact(row, "Expiration Date (if applicable)") ||
      pickCell(row, /^expiration date/i);
    let documentUrl =
      cellExact(row, "Upload Document") ||
      pickCell(row, /^upload document$/i);
    if (!documentUrl) {
      documentUrl = pickCell(row, /^upload|^file upload|document link$/i);
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
