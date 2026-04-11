import { fetchSheetTableFromWorkbook } from "@/lib/google-sheet";

/**
 * BLS AHA aligned instructors roster (audit list + row keys), gid 1766425749.
 * Instructor candidate UI defaults to this same tab (see aligned-instructors-credentials-sheet);
 * override credentials gid in env for a different tab (e.g. document uploads only).
 */
export const DEFAULT_METI_BLS_INSTRUCTORS_SHEET_ID =
  "1CGsM8UNbd0Zz0Cgv7_i4fg_hHU5TP6V384z4LN-ge1k";

/** Aligned instructor roster / main list tab (not the candidate upload tab). */
export const DEFAULT_METI_BLS_INSTRUCTORS_GID = "1766425749";

export function metiBlsInstructorsSheetId(): string {
  return (
    process.env.GOOGLE_SHEET_ID_METI_BLS_INSTRUCTORS?.trim() ||
    DEFAULT_METI_BLS_INSTRUCTORS_SHEET_ID
  );
}

export function metiBlsInstructorsGid(): string {
  return (
    process.env.GOOGLE_SHEET_GID_METI_BLS_INSTRUCTORS?.trim() ||
    DEFAULT_METI_BLS_INSTRUCTORS_GID
  );
}

export async function fetchMetiBlsInstructorsTable(): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  sourceUrl: string;
  fetchedAt: string;
}> {
  const sheetId = metiBlsInstructorsSheetId();
  const gid = metiBlsInstructorsGid();
  const { headers, rows, sourceUrl } = await fetchSheetTableFromWorkbook(
    sheetId,
    gid,
    { live: false },
  );
  return {
    headers,
    rows,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export function metiBlsInstructorsSheetEditUrl(): string {
  const id = metiBlsInstructorsSheetId();
  const gid = metiBlsInstructorsGid();
  return `https://docs.google.com/spreadsheets/d/${id}/edit?gid=${gid}`;
}
