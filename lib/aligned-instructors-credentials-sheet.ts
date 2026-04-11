import { fetchSheetTableFromWorkbook } from "@/lib/google-sheet";

/** Aligned instructors credentials tab (defaults match provided Google Sheet URL). */
export const DEFAULT_ALIGNED_CREDENTIALS_SHEET_ID =
  "1CGsM8UNbd0Zz0Cgv7_i4fg_hHU5TP6V384z4LN-ge1k";

export const DEFAULT_ALIGNED_CREDENTIALS_GID = "1766425749";

export function alignedInstructorsCredentialsSheetId(): string {
  return (
    process.env.GOOGLE_SHEET_ID_ALIGNED_INSTRUCTOR_CREDENTIALS?.trim() ||
    DEFAULT_ALIGNED_CREDENTIALS_SHEET_ID
  );
}

export function alignedInstructorsCredentialsGid(): string {
  return (
    process.env.GOOGLE_SHEET_GID_ALIGNED_INSTRUCTOR_CREDENTIALS?.trim() ||
    DEFAULT_ALIGNED_CREDENTIALS_GID
  );
}

export function alignedInstructorsCredentialsSheetEditUrl(): string {
  const id = alignedInstructorsCredentialsSheetId();
  const gid = alignedInstructorsCredentialsGid();
  return `https://docs.google.com/spreadsheets/d/${id}/edit?gid=${gid}#gid=${gid}`;
}

export function credentialsRowKey(
  row: Record<string, string>,
  headers: string[],
): string {
  const parts = headers.map((h) => (row[h] ?? "").trim());
  const t = parts.join("|").slice(0, 400);
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) | 0;
  }
  return `cred-${Math.abs(h).toString(36)}`;
}

export async function fetchAlignedInstructorsCredentialsTable(): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  sourceUrl: string;
  fetchedAt: string;
}> {
  const sheetId = alignedInstructorsCredentialsSheetId();
  const gid = alignedInstructorsCredentialsGid();
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

export type CredentialsRowWithKey = {
  rowKey: string;
  row: Record<string, string>;
};

export function attachCredentialsRowKeys(
  headers: string[],
  rows: Record<string, string>[],
): CredentialsRowWithKey[] {
  return rows.map((row) => ({
    rowKey: credentialsRowKey(row, headers),
    row,
  }));
}
