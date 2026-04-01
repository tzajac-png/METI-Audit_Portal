import {
  DEFAULT_GID_INSTRUCTOR_DIRECTORY,
  fetchSheetTable,
} from "@/lib/google-sheet";

export type InstructorDirectoryRow = Record<string, string>;

export async function fetchInstructorDirectory(): Promise<{
  headers: string[];
  rows: InstructorDirectoryRow[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid =
    process.env.GOOGLE_SHEET_GID_INSTRUCTOR_DIRECTORY?.trim() ??
    DEFAULT_GID_INSTRUCTOR_DIRECTORY;
  const { headers, rows, sourceUrl } = await fetchSheetTable(gid);
  return {
    headers,
    rows,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}
