import {
  fetchInstructorCoursesForGid,
  BLS_SKILLS_CHECK_INSTRUCTOR_COURSE_DOC_COLUMN_INDEX,
  type InstructorCourseSummary,
} from "@/lib/instructor-courses";
import type { ProgramCourseSummary } from "@/lib/program-courses";
import {
  DEFAULT_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR,
  DEFAULT_GID_BLS_SKILLS_CHECKOFF_STUDENTS,
  DEFAULT_SHEET_ID,
  fetchSheetTableFromWorkbook,
} from "@/lib/google-sheet";
import {
  enrichBlsSkillsCheckoffStudentRow,
} from "@/lib/bls-skills-checkoff-student-links";
import { isPaidForByNorthville } from "@/lib/skills-check-northville";
import {
  buildStudentRowsFromSheetTable,
  filterStudentsByCourseCode,
  type StudentRow,
} from "@/lib/student-roster";

export type BlsSkillsCheckoffCourseSummary = ProgramCourseSummary;

function skillsCheckoffInstructorGid(): string {
  return (
    process.env.GOOGLE_SHEET_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR?.trim() ??
    DEFAULT_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR
  );
}

function skillsCheckoffStudentGid(): string {
  return (
    process.env.GOOGLE_SHEET_GID_BLS_SKILLS_CHECKOFF_STUDENTS?.trim() ??
    DEFAULT_GID_BLS_SKILLS_CHECKOFF_STUDENTS
  );
}

function workbookId(): string {
  return process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
}

function toSummary(c: InstructorCourseSummary): ProgramCourseSummary {
  const location = c.location || "—";
  return {
    courseCode: c.courseCode,
    dateLabel: c.dateLabel,
    leadInstructor: c.leadInstructor,
    location,
    courseDocumentUrl: c.courseDocumentUrl,
    columnZRaw: c.columnZRaw,
    raw: c.raw,
    paidForByNorthville: isPaidForByNorthville(c.raw),
  };
}

/**
 * BLS Skills Check off instructor tab — courses appear when an instructor submits
 * the class form (CourseCode / PendingCourseID on that row).
 */
export async function fetchBlsSkillsCheckoffCourseSummaries(): Promise<{
  courses: BlsSkillsCheckoffCourseSummary[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid = skillsCheckoffInstructorGid();
  const { courses, sourceUrl } = await fetchInstructorCoursesForGid(gid, null, {
    courseDocumentColumnIndex:
      BLS_SKILLS_CHECK_INSTRUCTOR_COURSE_DOC_COLUMN_INDEX,
  });
  return {
    courses: courses.map(toSummary),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}

export async function getBlsSkillsCheckoffCourseByCode(
  courseCode: string,
): Promise<BlsSkillsCheckoffCourseSummary | null> {
  const { courses } = await fetchBlsSkillsCheckoffCourseSummaries();
  const normalized = courseCode.trim();
  const exact = courses.find((c) => c.courseCode.trim() === normalized);
  return exact ?? null;
}

export async function fetchBlsSkillsCheckoffStudentRows(): Promise<{
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const table = await fetchSheetTableFromWorkbook(
    workbookId(),
    skillsCheckoffStudentGid(),
    { valuesOnly: false },
  );
  const base = buildStudentRowsFromSheetTable("BLS", table);
  const rows = base.rows.map((row, i) =>
    enrichBlsSkillsCheckoffStudentRow(
      row,
      table.headers,
      table.rawRowCells[i] ?? [],
    ),
  );
  return { ...base, rows };
}

export async function fetchBlsSkillsCheckoffStudentsForCourse(
  courseCode: string,
): Promise<{
  students: StudentRow[];
  fetchedAt: string;
}> {
  const { rows, fetchedAt } = await fetchBlsSkillsCheckoffStudentRows();
  return {
    students: filterStudentsByCourseCode(rows, courseCode),
    fetchedAt,
  };
}
