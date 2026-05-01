import type { CourseType } from "@/lib/course";
import {
  fetchInstructorCoursesForGid,
  gidForCourseType,
  type InstructorCourseSummary,
} from "@/lib/instructor-courses";

export type ProgramCourseSummary = {
  courseCode: string;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  courseDocumentUrl: string;
  columnZRaw: string;
  raw: Record<string, string>;
};

function toSummary(c: InstructorCourseSummary): ProgramCourseSummary {
  return {
    courseCode: c.courseCode,
    dateLabel: c.dateLabel,
    leadInstructor: c.leadInstructor,
    location: c.location,
    courseDocumentUrl: c.courseDocumentUrl,
    columnZRaw: c.columnZRaw,
    raw: c.raw,
  };
}

/**
 * Instructor roster rows for one program (BLS, ACLS, PALS, or Heartsaver).
 */
export async function fetchProgramCourseSummaries(
  courseType: CourseType,
): Promise<{
  courses: ProgramCourseSummary[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid = gidForCourseType(courseType);
  const { courses, sourceUrl } = await fetchInstructorCoursesForGid(
    gid,
    courseType,
  );
  return {
    courses: courses.map(toSummary),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}

export async function getProgramCourseByCode(
  courseType: CourseType,
  courseCode: string,
): Promise<ProgramCourseSummary | null> {
  const { courses } = await fetchProgramCourseSummaries(courseType);
  const normalized = courseCode.trim();
  return (
    courses.find((c) => c.courseCode.trim() === normalized) ?? null
  );
}
