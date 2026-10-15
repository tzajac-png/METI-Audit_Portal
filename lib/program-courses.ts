import type { CourseType } from "@/lib/course";
import {
  fetchInstructorCoursesForGid,
  gidForCourseType,
  type InstructorCourseSummary,
} from "@/lib/instructor-courses";
import { isPaidForByNorthville } from "@/lib/skills-check-northville";

export type ProgramCourseSummary = {
  courseCode: string;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  courseDocumentUrl: string;
  columnZRaw: string;
  raw: Record<string, string>;
  /** Instructor row has “Paid for by Northville?” = Yes. */
  paidForByNorthville?: boolean;
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
    paidForByNorthville: isPaidForByNorthville(c.raw),
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

function foldCourseCode(s: string): string {
  return s.trim().normalize("NFKC");
}

export async function getProgramCourseByCode(
  courseType: CourseType,
  courseCode: string,
): Promise<ProgramCourseSummary | null> {
  const { courses } = await fetchProgramCourseSummaries(courseType);
  const normalized = foldCourseCode(courseCode);
  const exact = courses.find((c) => foldCourseCode(c.courseCode) === normalized);
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  return (
    courses.find(
      (c) => foldCourseCode(c.courseCode).toLowerCase() === lower,
    ) ?? null
  );
}
