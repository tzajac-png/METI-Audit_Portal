import {
  fetchInstructorCoursesForGid,
  type InstructorCourseSummary,
} from "@/lib/instructor-courses";
import { INSTRUCTOR_SPREADSHEET_ID } from "@/lib/instructor-course-sheets";
import type { ProgramCourseSummary } from "@/lib/program-courses";
import { isPaidForByNorthville } from "@/lib/skills-check-northville";
import { decodeCoursePathSegment, encodeCoursePathSegment } from "@/lib/course-path-codec";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";
import {
  DEFAULT_GID_PALS_STUDENTS,
  DEFAULT_SHEET_ID,
} from "@/lib/google-sheet";
import {
  fetchStudentRowsForCourseType,
  type StudentRow,
} from "@/lib/student-roster";

/**
 * Student PALS tab — same workbook env as BLS/ACLS (`GOOGLE_SHEET_ID` or default).
 * @see https://docs.google.com/spreadsheets/d/1J9OO6YGdwnArcVn_K8CUHQHwOiIAeQj2vZcpyIbWWTE/edit?gid=504976157#gid=504976157
 */
const _palsStudentWorkbookId =
  process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
const _palsStudentGid =
  process.env.GOOGLE_SHEET_GID_PALS_STUDENTS?.trim() ?? DEFAULT_GID_PALS_STUDENTS;

export const PALS_STUDENT_WORKBOOK_ID = _palsStudentWorkbookId;
export const PALS_STUDENT_TAB_GID = _palsStudentGid;

/** Instructor PALS roster tab (course rows / metadata for class pages). */
export const PALS_INSTRUCTOR_TAB_GID = "547470971";

export const PALS_INSTRUCTOR_EDIT_URL = `https://docs.google.com/spreadsheets/d/${INSTRUCTOR_SPREADSHEET_ID}/edit?gid=${PALS_INSTRUCTOR_TAB_GID}#gid=${PALS_INSTRUCTOR_TAB_GID}`;
export const PALS_STUDENT_EDIT_URL = `https://docs.google.com/spreadsheets/d/${PALS_STUDENT_WORKBOOK_ID}/edit?gid=${PALS_STUDENT_TAB_GID}#gid=${PALS_STUDENT_TAB_GID}`;

function toProgramSummary(c: InstructorCourseSummary): ProgramCourseSummary {
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

function foldCourseCode(s: string): string {
  return s.trim().normalize("NFKC");
}

/**
 * When the instructor roster row was removed or the code was edited, still
 * render the course detail for the code from the URL so roster/student data can load.
 */
export function minimalPalsCourseStub(courseCode: string): ProgramCourseSummary {
  const code = courseCode.trim();
  return {
    courseCode: code,
    dateLabel: "—",
    leadInstructor: "—",
    location: "—",
    courseDocumentUrl: "",
    columnZRaw: "",
    raw: { CourseCode: code },
  };
}

export async function fetchPalsCourses(): Promise<{
  courses: ProgramCourseSummary[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const { courses, sourceUrl } = await fetchInstructorCoursesForGid(
    PALS_INSTRUCTOR_TAB_GID,
    "PALS",
    { live: true },
  );
  return {
    courses: courses.map(toProgramSummary),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}

export function resolvePalsCourseCodeFromUrlSegment(
  segment: string | undefined,
): string {
  const raw = segment?.trim() ?? "";
  if (!raw) return "";
  const fromCodec = decodeCoursePathSegment(raw);
  if (fromCodec) return fromCodec;
  return safeDecodePathSegment(raw);
}

export async function findPalsCourseByCode(
  courseCode: string,
): Promise<ProgramCourseSummary | null> {
  const { courses } = await fetchPalsCourses();
  const normalized = foldCourseCode(courseCode);
  const exact = courses.find(
    (c) => foldCourseCode(c.courseCode) === normalized,
  );
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  return (
    courses.find(
      (c) => foldCourseCode(c.courseCode).toLowerCase() === lower,
    ) ?? null
  );
}

export type PalsResolvedCourse = {
  course: ProgramCourseSummary;
  pathSeg: string;
  instructorRowMissing: boolean;
};

export type PalsStudentSheetPack = {
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
};

function pickPalsCourseFromList(
  courses: ProgramCourseSummary[],
  key: string,
): ProgramCourseSummary | null {
  const normalized = foldCourseCode(key);
  const exact = courses.find(
    (c) => foldCourseCode(c.courseCode) === normalized,
  );
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  return (
    courses.find(
      (c) => foldCourseCode(c.courseCode).toLowerCase() === lower,
    ) ?? null
  );
}

/**
 * One round-trip each: instructor PALS tab + PALS Student tab (same loader as ACLS).
 */
export async function resolvePalsCourseWithParallelStudentFetch(
  segment: string | undefined,
): Promise<{
  resolved: PalsResolvedCourse;
  studentSheet: PalsStudentSheetPack;
} | null> {
  const key = resolvePalsCourseCodeFromUrlSegment(segment);
  if (!key) return null;

  const [coursesPack, studentSheet] = await Promise.all([
    fetchPalsCourses(),
    fetchPalsStudentRows(),
  ]);

  const fromSheet = pickPalsCourseFromList(coursesPack.courses, key);
  const course = fromSheet ?? minimalPalsCourseStub(key);
  const pathSeg = encodeCoursePathSegment(course.courseCode.trim());
  const resolved: PalsResolvedCourse = {
    course,
    pathSeg,
    instructorRowMissing: !fromSheet,
  };
  return { resolved, studentSheet };
}

/**
 * Resolve URL segment to a course row, or a stub if the row no longer exists.
 * Prefer {@link resolvePalsCourseWithParallelStudentFetch} on detail pages to avoid doubling latency.
 */
export async function getPalsCourseForPathSegment(
  segment: string | undefined,
): Promise<PalsResolvedCourse | null> {
  const key = resolvePalsCourseCodeFromUrlSegment(segment);
  if (!key) return null;

  const fromSheet = await findPalsCourseByCode(key);
  const course = fromSheet ?? minimalPalsCourseStub(key);
  const pathSeg = encodeCoursePathSegment(course.courseCode.trim());
  return { course, pathSeg, instructorRowMissing: !fromSheet };
}

/** PALS Student signup rows — identical pathway to ACLS (`fetchStudentRowsForCourseType("PALS")`). */
export async function fetchPalsStudentRows(): Promise<PalsStudentSheetPack> {
  return fetchStudentRowsForCourseType("PALS", { live: true });
}
