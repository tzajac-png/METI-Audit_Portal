import type { CourseType } from "@/lib/course";
import { COURSE_TYPES, inferCourseType } from "@/lib/course";
import type { DirectoryRow } from "@/lib/student-directory";
import { directoryRowMatchesSignupRow } from "@/lib/directory-helpers";
import { fetchStudentRowsForCourseType } from "@/lib/student-roster";
import type { StudentRow } from "@/lib/student-roster";

export type ClassHistoryEntry = {
  program: CourseType | "Other";
  sourceProgram: CourseType;
  courseCode: string;
  classDate: string;
  instructor: string;
  location: string;
  score: string;
  status: string;
  timestamp: string;
};

function pick(
  row: Record<string, string>,
  keys: string[],
): string {
  for (const k of keys) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  return "";
}

function rowToHistoryEntry(
  row: StudentRow,
  sourceProgram: CourseType,
): ClassHistoryEntry {
  const courseCode = pick(row, ["CourseCode", "PendingCourseID"]);
  return {
    program: inferCourseType(courseCode),
    sourceProgram,
    courseCode,
    classDate: pick(row, ["Class Date", "Course Start Date"]),
    instructor: pick(row, [
      "Course Instructors",
      "Course Instructor",
      "Lead Instructor",
    ]),
    location: pick(row, ["Course Location", "Place", "Location"]),
    score: pick(row, ["Score"]),
    status: pick(row, ["Status"]),
    timestamp: pick(row, ["Timestamp"]),
  };
}

function parseUsDate(s: string): number {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * All signup rows across BLS / ACLS / PALS / Heartsaver student tabs that match this directory person.
 */
export async function fetchClassHistoryForDirectoryPerson(
  directoryRow: DirectoryRow,
): Promise<ClassHistoryEntry[]> {
  const entries: ClassHistoryEntry[] = [];

  await Promise.all(
    COURSE_TYPES.map(async (t) => {
      try {
        const { rows } = await fetchStudentRowsForCourseType(t);
        for (const row of rows) {
          if (!directoryRowMatchesSignupRow(directoryRow, row)) continue;
          entries.push(rowToHistoryEntry(row, t));
        }
      } catch {
        /* skip tab if fetch fails */
      }
    }),
  );

  entries.sort(
    (a, b) => parseUsDate(b.classDate || b.timestamp) - parseUsDate(a.classDate || a.timestamp),
  );

  return entries;
}
