import { fetchSheetTableFromWorkbook } from "@/lib/google-sheet";

/** METI-aligned BLS AHA instructors workbook (defaults match provided sheet URL). */
export const DEFAULT_METI_BLS_INSTRUCTORS_SHEET_ID =
  "1o_fF1Ldc7TtwSWtI-obGN5z16c2Fes1zWr_PiN4yxFU";

export const DEFAULT_METI_BLS_INSTRUCTORS_GID = "2143386597";

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
