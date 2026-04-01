import { fetchStudentRows, type StudentRow } from "@/lib/student-roster";

/** @deprecated Use StudentRow from student-roster */
export type CourseRow = StudentRow;

/**
 * Student sign-up tab (audit / legacy views).
 * Uses GOOGLE_SHEET_GID_STUDENTS or default BLS Student gid.
 */
export async function fetchCourseRows(): Promise<{
  rows: CourseRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  return fetchStudentRows();
}
