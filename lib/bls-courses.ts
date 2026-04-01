import {
  fetchProgramCourseSummaries,
  type ProgramCourseSummary,
} from "@/lib/program-courses";
import {
  INSTRUCTOR_SHEET_COLUMN_Z_INDEX,
} from "@/lib/instructor-courses";

export type BlsCourseSummary = ProgramCourseSummary;

export { INSTRUCTOR_SHEET_COLUMN_Z_INDEX };

/**
 * Instructor roster tab — BLS course rows only.
 */
export async function fetchBlsCourseSummaries(): Promise<{
  courses: BlsCourseSummary[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  return fetchProgramCourseSummaries("BLS");
}

export async function getBlsCourseByCode(
  courseCode: string,
): Promise<BlsCourseSummary | null> {
  const { courses } = await fetchBlsCourseSummaries();
  const normalized = courseCode.trim();
  return courses.find((c) => c.courseCode === normalized) ?? null;
}
