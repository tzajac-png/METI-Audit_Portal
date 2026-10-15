import type { StudentRow } from "@/lib/student-roster";
import {
  pickStudentField,
  ROSTER_CLASS_DATE_KEYS,
  ROSTER_EMAIL_KEYS,
  ROSTER_FIRST_NAME_KEYS,
  ROSTER_LAST_NAME_KEYS,
} from "@/lib/student-display";

export type CourseRosterXlsxRow = {
  courseDate: string;
  firstName: string;
  lastName: string;
  email: string;
};

/** Normalize sheet / course dates to MM/DD/YYYY for roster export. */
export function formatRosterDateMmDdYyyy(raw: string): string {
  const t = raw.trim();
  if (!t) return "";

  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
    }
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
    }
  }

  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const year = dt.getFullYear();
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }

  return t;
}

export function buildCourseRosterXlsxRows(
  students: StudentRow[],
  courseDateFallback: string,
): CourseRosterXlsxRow[] {
  const fallback = courseDateFallback.trim();
  return students.map((s) => ({
    courseDate:
      pickStudentField(s, [...ROSTER_CLASS_DATE_KEYS]) || fallback,
    firstName: pickStudentField(s, [...ROSTER_FIRST_NAME_KEYS]),
    lastName: pickStudentField(s, [...ROSTER_LAST_NAME_KEYS]),
    email: pickStudentField(s, [...ROSTER_EMAIL_KEYS]),
  }));
}

export async function buildCourseRosterXlsxBytes(
  rows: CourseRosterXlsxRow[],
): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const sheetData: string[][] = [
    ["Course Date", "First Name", "Last Name", "Email"],
    ...rows.map((r) => [
      formatRosterDateMmDdYyyy(r.courseDate),
      r.firstName,
      r.lastName,
      r.email,
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buffer as ArrayBuffer);
}
