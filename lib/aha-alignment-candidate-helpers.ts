import type { AlignedInstructorRowSummary } from "@/lib/aligned-instructor-row-summaries";
import {
  isPlausiblePersonNameCellValue,
  parseFirstLastName,
} from "@/lib/aligned-instructor-row-summaries";

/** Stable key for grouping and URLs (lowercase, collapsed whitespace). */
export function normalizeInstructorKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function candidateProfileSlugFromNormalizedKey(normalizedKey: string): string {
  return Buffer.from(normalizedKey, "utf8").toString("base64url");
}

export function normalizedKeyFromCandidateProfileSlug(slug: string): string | null {
  try {
    const raw = decodeURIComponent(slug.trim());
    return Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function findInstructorNameInRow(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    if (/^instructor\s*name$/i.test(h.trim())) {
      const v = (row[h] ?? "").trim();
      if (v && isPlausiblePersonNameCellValue(v)) return v;
    }
  }
  const { fullName } = parseFirstLastName(row, headers);
  if (fullName && fullName !== "(Row)") return fullName;
  return "";
}

export function pickDocumentType(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    if (/^document\s*type$/i.test(h.trim())) {
      return (row[h] ?? "").trim();
    }
  }
  return "";
}

export function pickExpiration(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    if (/expiration/i.test(h.trim())) {
      return (row[h] ?? "").trim();
    }
  }
  return "";
}

export function pickUploadDocument(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    const ht = h.trim();
    if (/^upload\s*document$/i.test(ht)) return (row[h] ?? "").trim();
    if (/^upload\s*document\s*link$/i.test(ht)) return (row[h] ?? "").trim();
  }
  return "";
}

export function pickTimestamp(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    if (/^timestamp$/i.test(h.trim())) {
      return (row[h] ?? "").trim();
    }
  }
  return "";
}

/** Form / sheet column for workflow status (e.g. Cards issued). */
export function pickSubmissionStatus(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    const ht = h.trim();
    if (
      /^status$/i.test(ht) ||
      /submission.*status/i.test(ht) ||
      /cards?\s*issues?|documents?\s*audited|audit\s*status/i.test(ht) ||
      /processing\s*status|workflow|review\s*status|document\s*status/i.test(ht) ||
      (/status/i.test(ht) &&
        /card|document|submission|course|instructor|alignment/i.test(ht))
    ) {
      const v = (row[h] ?? "").trim();
      if (v) return v;
    }
  }
  return "";
}

/** Status and/or document-type labels across a candidate's rows (candidates list). */
export function summarizeCandidateSubmissionLabels(
  rows: Record<string, string>[],
  headers: string[],
): string {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const s = pickSubmissionStatus(row, headers).trim();
    const d = pickDocumentType(row, headers).trim();
    const label = s || d;
    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      labels.push(label);
    }
  }
  if (labels.length === 0) return "—";
  return labels.join("; ");
}

export function candidateFirstLastFromRows(
  rows: readonly Record<string, string>[],
  headers: string[],
  displayNameFallback: string,
): { firstName: string; lastName: string } {
  if (rows.length > 0) {
    const { firstName, lastName, fullName } = parseFirstLastName(
      rows[0]!,
      headers,
    );
    if (firstName || lastName) {
      return { firstName, lastName };
    }
    const name = fullName.trim() || displayNameFallback.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  }
  const parts = displayNameFallback.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function findRosterRowKeyForCandidateName(
  instructorName: string,
  summaries: AlignedInstructorRowSummary[],
): string | null {
  const n = normalizeInstructorKey(instructorName);
  if (!n) return null;
  for (const s of summaries) {
    if (normalizeInstructorKey(s.displayLabel) === n) return s.rowKey;
    const combined = normalizeInstructorKey(`${s.firstName} ${s.lastName}`);
    if (combined === n) return s.rowKey;
  }
  return null;
}

export type CandidateSubmission = {
  rowKey: string;
  instructorName: string;
  documentType: string;
  status: string;
  expiration: string;
  uploadUrl: string;
  timestamp: string;
};

export function rowToCandidateSubmission(
  row: Record<string, string>,
  headers: string[],
  rowKey: string,
): CandidateSubmission {
  return {
    rowKey,
    instructorName: findInstructorNameInRow(row, headers),
    documentType: pickDocumentType(row, headers),
    status: pickSubmissionStatus(row, headers),
    expiration: pickExpiration(row, headers),
    uploadUrl: pickUploadDocument(row, headers),
    timestamp: pickTimestamp(row, headers),
  };
}
