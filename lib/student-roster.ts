import { inferCourseType, stableRowId, type CourseType } from "@/lib/course";
import {
  DEFAULT_GID_ACLS_STUDENTS,
  DEFAULT_GID_HEARTSAVER_STUDENTS,
  DEFAULT_GID_PALS_STUDENTS,
  DEFAULT_GID_STUDENTS,
  fetchSheetTable,
} from "@/lib/google-sheet";

/** Column BN (1-based 66) = index 65. Exam PDF link (BLS Student tab layout). */
export const STUDENT_SHEET_COLUMN_BN_INDEX = 65;
/** Column BP (1-based 68) = index 67. Skills sheet link (BLS Student tab layout). */
export const STUDENT_SHEET_COLUMN_BP_INDEX = 67;
/** Column CO (1-based 93) = index 92. Exam PDF on PALS Student tab (gid 504976157). */
export const STUDENT_SHEET_COLUMN_CO_INDEX = 92;

export type StudentRow = Record<string, string> & {
  _courseType: CourseType | "Other";
  _rowId: string;
  /** Exam / eval PDF — BLS: column BN; PALS: column CO when set; else header match */
  _examPdfUrl: string;
  /** Skills / checklist PDF — column BP on BLS tab, or header match on other tabs */
  _skillsSheetUrl: string;
};

function gidForStudentTab(courseType: CourseType): string {
  switch (courseType) {
    case "BLS":
      return process.env.GOOGLE_SHEET_GID_STUDENTS?.trim() ?? DEFAULT_GID_STUDENTS;
    case "ACLS":
      return (
        process.env.GOOGLE_SHEET_GID_ACLS_STUDENTS?.trim() ??
        DEFAULT_GID_ACLS_STUDENTS
      );
    case "PALS":
      return (
        process.env.GOOGLE_SHEET_GID_PALS_STUDENTS?.trim() ??
        DEFAULT_GID_PALS_STUDENTS
      );
    case "Heartsaver":
      return (
        process.env.GOOGLE_SHEET_GID_HEARTSAVER_STUDENTS?.trim() ??
        DEFAULT_GID_HEARTSAVER_STUDENTS
      );
    default:
      return DEFAULT_GID_STUDENTS;
  }
}

function httpCell(s: string): string {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://") ? t : "";
}

/**
 * Finds exam vs skills document URLs from headers + cells (per-tab layouts differ).
 * BLS uses fixed BN/BP; other tabs use Document Studio column names.
 */
function extractExamAndSkillsUrls(
  headers: string[],
  cells: string[],
  courseType?: CourseType,
): { exam: string; skills: string } {
  let skills = "";
  let exam = "";

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    const v = httpCell(cells[i] ?? "");
    if (!v) continue;

    if (
      !skills &&
      (/skill/i.test(h) || /checklist/i.test(h)) &&
      !/evaluation|evals\s|student evaluation/i.test(h)
    ) {
      skills = v;
      continue;
    }
    if (!exam && /course document eval|eval.*pdf|merged.*exam/i.test(h)) {
      exam = v;
      continue;
    }
    if (
      !exam &&
      /fillable pdf/i.test(h) &&
      /eval|evaluation/i.test(h) &&
      !/skill/i.test(h)
    ) {
      exam = v;
      continue;
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    const v = httpCell(cells[i] ?? "");
    if (!v) continue;
    if (!exam && /exam/i.test(h) && !/instructor/i.test(h)) {
      exam = v;
      break;
    }
  }

  if (!exam && cells.length > STUDENT_SHEET_COLUMN_BN_INDEX) {
    const v = httpCell(cells[STUDENT_SHEET_COLUMN_BN_INDEX] ?? "");
    if (v) exam = v;
  }
  if (!skills && cells.length > STUDENT_SHEET_COLUMN_BP_INDEX) {
    const v = httpCell(cells[STUDENT_SHEET_COLUMN_BP_INDEX] ?? "");
    if (v) skills = v;
  }

  if (
    courseType === "PALS" &&
    cells.length > STUDENT_SHEET_COLUMN_CO_INDEX
  ) {
    const co = httpCell(cells[STUDENT_SHEET_COLUMN_CO_INDEX] ?? "");
    if (co) exam = co;
  }

  return { exam, skills };
}

export async function fetchStudentRowsForCourseType(
  courseType: CourseType,
): Promise<{
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const gid = gidForStudentTab(courseType);
  const { headers, rows: objects, rawRowCells, sourceUrl } =
    await fetchSheetTable(gid);

  const courseCodeKey =
    headers.find((h) => h.toLowerCase() === "coursecode") ?? "CourseCode";
  const pendingKey =
    headers.find((h) => h.toLowerCase() === "pendingcourseid") ??
    "PendingCourseID";

  const rows: StudentRow[] = objects.map((obj, i) => {
    const code = obj[courseCodeKey] || obj[pendingKey] || "";
    const type = inferCourseType(code);
    const cells = rawRowCells[i] ?? [];
    const { exam, skills } = extractExamAndSkillsUrls(headers, cells, courseType);
    return {
      ...obj,
      _courseType: type,
      _rowId: stableRowId(obj),
      _examPdfUrl: exam,
      _skillsSheetUrl: skills,
    };
  });

  return {
    rows,
    headers,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}

export async function fetchStudentRows(): Promise<{
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  return fetchStudentRowsForCourseType("BLS");
}

/**
 * Students whose CourseCode or PendingCourseID matches the instructor course line.
 */
export function filterStudentsByCourseCode(
  students: StudentRow[],
  courseCode: string,
): StudentRow[] {
  const key = courseCode.trim();
  if (!key) return [];
  return students.filter((s) => {
    const cc = (s["CourseCode"] ?? "").trim();
    const pid = (s["PendingCourseID"] ?? "").trim();
    return cc === key || pid === key;
  });
}

export function findStudentByRowId(
  students: StudentRow[],
  rowId: string,
): StudentRow | undefined {
  if (!rowId.trim()) return undefined;
  return students.find((s) => s._rowId === rowId);
}
