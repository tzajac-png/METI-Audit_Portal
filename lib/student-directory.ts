import {
  DEFAULT_GID_STUDENT_DIRECTORY,
  fetchSheetTable,
} from "@/lib/google-sheet";

export type DirectoryRow = Record<string, string>;

export async function fetchStudentDirectory(): Promise<{
  headers: string[];
  rows: DirectoryRow[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid =
    process.env.GOOGLE_SHEET_GID_STUDENT_DIRECTORY?.trim() ??
    DEFAULT_GID_STUDENT_DIRECTORY;
  const { headers, rows, sourceUrl } = await fetchSheetTable(gid);
  return {
    headers,
    rows,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}
