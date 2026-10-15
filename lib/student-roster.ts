import { inferCourseType, stableRowId, type CourseType } from "@/lib/course";
import {
  DEFAULT_GID_ACLS_STUDENTS,
  DEFAULT_GID_HEARTSAVER_STUDENTS,
  DEFAULT_GID_PALS_STUDENTS,
  DEFAULT_GID_STUDENTS,
  DEFAULT_SHEET_ID,
  fetchSheetTableFromWorkbook,
} from "@/lib/google-sheet";

/** Column BN (1-based 66) = index 65. Exam PDF link (BLS Student tab layout). */
export const STUDENT_SHEET_COLUMN_BN_INDEX = 65;
/** Column BP (1-based 68) = index 67. Skills sheet link (BLS Student tab layout). */
export const STUDENT_SHEET_COLUMN_BP_INDEX = 67;
/** Column CO (1-based 93) = index 92. Exam / course document link on PALS Student tab. */
export const STUDENT_SHEET_COLUMN_CO_INDEX = 92;

export type StudentRow = Record<string, string> & {
  _courseType: CourseType | "Other";
  _rowId: string;
  /** Exam PDF — headers + BLS column BN; PALS uses column CO as the Exam button target. */
  _examPdfUrl: string;
  /** Skills / checklist PDF — column BP on BLS tab, or header match on other tabs */
  _skillsSheetUrl: string;
  /** BLS Skills Check tab — column N online certificate upload link */
  _certificateUrl?: string;
  /** BLS Skills Check tab — column AK BLS skill sheet (evaluation) link */
  _evaluationUrl?: string;
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
 * BLS may use fixed BN/BP fallbacks when headers do not match.
 * PALS: column CO wins for Exam (overrides header matches that may point at evaluation).
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

    const hNorm = normalizeStudentSheetHeader(h);
    if (
      !skills &&
      (hNorm === "skillsheet" ||
        ((/skill/i.test(h) || /checklist/i.test(h)) &&
          !/evaluation|evals\s|student evaluation/i.test(h)))
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

function normalizeStudentSheetHeader(col: string): string {
  return col.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Course / pending id values from a signup row, using any column name the tab
 * might use (“CourseCode”, “Course Code”, “PendingCourseID”, etc.).
 */
export function courseCodesFromStudentRow(
  row: Record<string, string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [col, val] of Object.entries(row)) {
    if (col.startsWith("_")) continue;
    const t = String(val ?? "").trim();
    if (!t) continue;
    const nk = normalizeStudentSheetHeader(col);
    const byNormalizedKey =
      nk === "coursecode" ||
      nk === "pendingcourseid" ||
      nk === "pendingid" ||
      nk === "courseid";
    const byHeaderPattern =
      /course\s*code|pending\s*course|class\s*code|registration\s*code/i.test(
        col,
      );
    if (byNormalizedKey || byHeaderPattern) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

export function buildStudentRowsFromSheetTable(
  courseType: CourseType,
  input: {
    headers: string[];
    rows: Record<string, string>[];
    rawRowCells: string[][];
    sourceUrl: string;
  },
): {
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
} {
  return studentRowsFromTable(courseType, input);
}

function studentRowsFromTable(
  courseType: CourseType,
  input: {
    headers: string[];
    rows: Record<string, string>[];
    rawRowCells: string[][];
    sourceUrl: string;
  },
): {
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
} {
  const { headers, rows: objects, rawRowCells, sourceUrl } = input;

  const courseCodeKey =
    headers.find((h) => normalizeStudentSheetHeader(h) === "coursecode") ??
    "CourseCode";
  const pendingKey =
    headers.find(
      (h) => normalizeStudentSheetHeader(h) === "pendingcourseid",
    ) ?? "PendingCourseID";

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

/**
 * Load a student signup tab by workbook id + gid (PALS uses this with fixed gids).
 * Uses the Sheets **values** API by default so formula / hyperlink columns do not force
 * a huge `includeGridData` response (which often times out on Vercel). Override with
 * `GOOGLE_SHEETS_STUDENT_TAB_USE_GRID=true` if you rely on hiding rows via the Sheets UI only.
 */
const STUDENT_TAB_FORCE_GRID_ENV = "GOOGLE_SHEETS_STUDENT_TAB_USE_GRID";

export function studentTabSheetOptions(
  sheetOptions?: { live?: boolean },
): { live?: boolean; valuesOnly?: boolean } {
  const forceGrid =
    process.env[STUDENT_TAB_FORCE_GRID_ENV]?.trim() === "true" ||
    process.env[STUDENT_TAB_FORCE_GRID_ENV]?.trim() === "1";
  return {
    ...sheetOptions,
    valuesOnly: forceGrid ? false : true,
  };
}

export async function fetchStudentRowsForTabGid(
  courseType: CourseType,
  workbookId: string,
  gid: string,
  sheetOptions?: { live?: boolean },
): Promise<{
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const table = await fetchSheetTableFromWorkbook(
    workbookId,
    gid,
    studentTabSheetOptions(sheetOptions),
  );
  return studentRowsFromTable(courseType, table);
}

/**
 * Same pathway as BLS/ACLS: `GOOGLE_SHEET_ID` (or default workbook) + program student gid.
 */
export async function fetchStudentRowsForCourseType(
  courseType: CourseType,
  sheetOptions?: { live?: boolean },
): Promise<{
  rows: StudentRow[];
  headers: string[];
  fetchedAt: string;
  sourceUrl: string;
}> {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
  const gid = gidForStudentTab(courseType);
  return fetchStudentRowsForTabGid(courseType, sheetId, gid, sheetOptions);
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
  const keyLower = key.toLowerCase();
  return students.filter((s) =>
    courseCodesFromStudentRow(s).some(
      (c) => c === key || c.toLowerCase() === keyLower,
    ),
  );
}

export function findStudentByRowId(
  students: StudentRow[],
  rowId: string,
): StudentRow | undefined {
  if (!rowId.trim()) return undefined;
  return students.find((s) => s._rowId === rowId);
}
