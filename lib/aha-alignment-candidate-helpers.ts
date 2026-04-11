import type { AlignedInstructorRowSummary } from "@/lib/aligned-instructor-row-summaries";
import { parseFirstLastName } from "@/lib/aligned-instructor-row-summaries";

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
      return (row[h] ?? "").trim();
    }
  }
  return parseFirstLastName(row, headers).fullName;
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
    expiration: pickExpiration(row, headers),
    uploadUrl: pickUploadDocument(row, headers),
    timestamp: pickTimestamp(row, headers),
  };
}
