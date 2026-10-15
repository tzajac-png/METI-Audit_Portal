import { COURSE_TYPES, inferCourseType, type CourseType } from "@/lib/course";
import {
  DEFAULT_GID_BLS_INSTRUCTOR,
  DEFAULT_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR,
  fetchSheetTable,
} from "@/lib/google-sheet";
import {
  DEFAULT_INSTRUCTOR_GID,
  INSTRUCTOR_TAB_EDIT_URL,
} from "@/lib/instructor-course-sheets";
import { courseCodesFromStudentRow } from "@/lib/student-roster";

/** Column Z is index 25 (A = 0). */
export const INSTRUCTOR_SHEET_COLUMN_Z_INDEX = 25;

/** HS BLS Skills Check instructor tab — column X (0-based index 23) for course documents. */
export const BLS_SKILLS_CHECK_INSTRUCTOR_COURSE_DOC_COLUMN_INDEX = 23;

export type FetchInstructorCoursesOptions = {
  live?: boolean;
  /** When set, read course document URL from this column instead of Z / header fallbacks. */
  courseDocumentColumnIndex?: number;
};

/** Standard programs plus HS BLS Skills Check (separate instructor tab). */
export type AuditProgramType = CourseType | "HS BLS Skills Check";

export type InstructorCourseSummary = {
  courseType: AuditProgramType;
  courseCode: string;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  courseDocumentUrl: string;
  columnZRaw: string;
  raw: Record<string, string>;
};

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseUsDate(s: string): number {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function httpUrlFromCell(text: string): string {
  const t = text.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return "";
}

/** TRUE / Yes / 1 / X / On (checkbox exports) — treat as “hide this row” where applicable */
function isTruthyHiddenMarker(val: string): boolean {
  const v = val.trim().toLowerCase();
  return (
    v === "true" ||
    v === "yes" ||
    v === "y" ||
    v === "1" ||
    v === "x" ||
    v === "on" ||
    v === "hide" ||
    v === "hidden" ||
    v === "archived"
  );
}

/** Values that mean “not visible / not included” on positive visibility columns */
function isFalsyVisibleMarker(val: string): boolean {
  const v = val.trim().toLowerCase();
  return (
    v === "no" ||
    v === "n" ||
    v === "false" ||
    v === "0" ||
    v === "off" ||
    v === "hide" ||
    v === "hidden" ||
    v === "archived"
  );
}

function isVisibilityPositiveColumn(key: string): boolean {
  if (key === "visible") return true;
  if (
    key === "portal visible" ||
    (key.includes("portal") && key.includes("visible") && !key.includes("hide"))
  ) {
    return true;
  }
  if (key === "show on portal" || key === "show in portal") return true;
  if (key === "include in audit") return true;
  if (
    key === "show in audit" ||
    key === "show audit" ||
    key === "audit visible" ||
    key === "visible in audit"
  ) {
    return true;
  }
  if (key.includes("exclude")) return false;
  if (
    (key.includes("show") || key.includes("include")) &&
    key.includes("audit")
  ) {
    return true;
  }
  return false;
}

function cellValueIgnoreCase(
  raw: Record<string, string>,
  columnName: string,
): string {
  if (raw[columnName] != null && raw[columnName] !== "") {
    return String(raw[columnName]).trim();
  }
  const want = columnName.trim().toLowerCase();
  for (const [k, v] of Object.entries(raw)) {
    if (k.trim().toLowerCase() === want) return String(v ?? "").trim();
  }
  return "";
}

/**
 * Exclude a course row from portal / audit lists when the sheet marks it hidden.
 * (Rows hidden only via the Sheets UI are already dropped when using the Sheets API
 * — see fetchSheetGridOmittingHiddenRows — not when using CSV fallback.)
 */
export function shouldHideInstructorCourseRow(
  raw: Record<string, string>,
): boolean {
  const explicitCol = process.env.GOOGLE_SHEET_HIDE_COURSE_COLUMN?.trim();
  if (explicitCol) {
    const v = cellValueIgnoreCase(raw, explicitCol);
    if (!v) return false;
    return isTruthyHiddenMarker(v);
  }

  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toLowerCase();
    const val = String(v ?? "").trim();
    if (!val) continue;

    if (
      key === "hide" ||
      key === "hidden" ||
      key === "archived" ||
      key === "archive"
    ) {
      if (isTruthyHiddenMarker(val)) return true;
    }
    if (
      (key.includes("hide") && key.includes("audit")) ||
      (key.includes("hide") && key.includes("portal"))
    ) {
      if (isTruthyHiddenMarker(val)) return true;
    }
    if (
      key.includes("exclude") &&
      (key.includes("audit") ||
        key.includes("portal") ||
        key.includes("list"))
    ) {
      if (isTruthyHiddenMarker(val)) return true;
    }
    if (isVisibilityPositiveColumn(key)) {
      if (isFalsyVisibleMarker(val)) return true;
    }
    if (key === "status" || key === "course status") {
      const st = val.trim().toLowerCase();
      if (
        st === "hidden" ||
        st === "archived" ||
        st === "cancelled" ||
        st === "canceled"
      ) {
        return true;
      }
    }
  }

  return false;
}

export function gidForCourseType(t: CourseType): string {
  switch (t) {
    case "BLS":
      return (
        process.env.GOOGLE_SHEET_GID_BLS_INSTRUCTOR?.trim() ??
        DEFAULT_GID_BLS_INSTRUCTOR
      );
    case "ACLS":
      return (
        process.env.GOOGLE_SHEET_GID_ACLS_INSTRUCTOR?.trim() ??
        DEFAULT_INSTRUCTOR_GID.ACLS
      );
    case "PALS":
      return (
        process.env.GOOGLE_SHEET_GID_PALS_INSTRUCTOR?.trim() ??
        DEFAULT_INSTRUCTOR_GID.PALS
      );
    case "Heartsaver":
      return (
        process.env.GOOGLE_SHEET_GID_HEARTSAVER_INSTRUCTOR?.trim() ??
        DEFAULT_INSTRUCTOR_GID.Heartsaver
      );
    default:
      return DEFAULT_INSTRUCTOR_GID.BLS;
  }
}

/**
 * Instructor roster tab for one program — rows with CourseCode, Lead Instructor, etc.
 */
export async function fetchInstructorCoursesForGid(
  gid: string,
  expectedType: CourseType | null,
  sheetOptions?: FetchInstructorCoursesOptions,
): Promise<{ courses: InstructorCourseSummary[]; sourceUrl: string }> {
  const { rows, rawRowCells, sourceUrl } = await fetchSheetTable(
    gid,
    sheetOptions,
  );

  const summaries: InstructorCourseSummary[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const courseCode =
      pick(raw, ["CourseCode", "PendingCourseID"]) ||
      courseCodesFromStudentRow(raw)[0] ||
      "";
    if (!courseCode) continue;
    if (shouldHideInstructorCourseRow(raw)) continue;
    if (
      expectedType != null &&
      inferCourseType(courseCode) !== expectedType
    ) {
      continue;
    }

    const cells = rawRowCells[i] ?? [];
    const docColumnIndex = sheetOptions?.courseDocumentColumnIndex;
    let columnZRaw: string;
    let courseDocumentUrl: string;
    if (docColumnIndex != null) {
      columnZRaw = (cells[docColumnIndex] ?? "").trim();
      courseDocumentUrl = httpUrlFromCell(columnZRaw);
    } else {
      columnZRaw = (cells[INSTRUCTOR_SHEET_COLUMN_Z_INDEX] ?? "").trim();
      const fromZ = httpUrlFromCell(columnZRaw);
      const fromCourseDocs = httpUrlFromCell(
        pick(raw, ["Course Documents", "Course Document Link", "Course Paperwork"]),
      );
      const fromRosterPdf = httpUrlFromCell(
        pick(raw, ["Roster PDF Link", "Roster PDF"]),
      );
      courseDocumentUrl = fromZ || fromRosterPdf || fromCourseDocs;
    }

    const leadInstructor = pick(raw, ["Lead Instructor"]);
    const location = pick(raw, ["Course Location"]);
    const startDate = pick(raw, ["Course Start Date", "Class Date"]);
    const dateLabel = startDate || pick(raw, ["Timestamp"]);

    const inferred = inferCourseType(courseCode);
    const courseType: AuditProgramType =
      expectedType ?? (inferred === "Other" ? "BLS" : inferred);

    summaries.push({
      courseType,
      courseCode,
      dateLabel,
      leadInstructor: leadInstructor || "—",
      location: location || "—",
      courseDocumentUrl,
      columnZRaw,
      raw,
    });
  }

  summaries.sort((a, b) => parseUsDate(b.dateLabel) - parseUsDate(a.dateLabel));

  return { courses: summaries, sourceUrl };
}

function gidForBlsSkillsCheckoffInstructor(): string {
  return (
    process.env.GOOGLE_SHEET_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR?.trim() ??
    DEFAULT_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR
  );
}

export type FetchAllInstructorResult = {
  courses: InstructorCourseSummary[];
  fetchedAt: string;
  fetchErrors: { type: AuditProgramType; message: string }[];
};

export async function fetchAllInstructorCoursesForAudit(): Promise<FetchAllInstructorResult> {
  const fetchErrors: { type: AuditProgramType; message: string }[] = [];
  const all: InstructorCourseSummary[] = [];

  await Promise.all([
    ...COURSE_TYPES.map(async (t) => {
      const gid = gidForCourseType(t);
      try {
        const { courses } = await fetchInstructorCoursesForGid(gid, t);
        all.push(...courses);
      } catch (e) {
        fetchErrors.push({
          type: t,
          message: e instanceof Error ? e.message : "Sheet fetch failed",
        });
      }
    }),
    (async () => {
      const gid = gidForBlsSkillsCheckoffInstructor();
      try {
        const { courses } = await fetchInstructorCoursesForGid(gid, null, {
          courseDocumentColumnIndex:
            BLS_SKILLS_CHECK_INSTRUCTOR_COURSE_DOC_COLUMN_INDEX,
        });
        all.push(
          ...courses.map((c) => ({
            ...c,
            courseType: "HS BLS Skills Check" as const,
          })),
        );
      } catch (e) {
        fetchErrors.push({
          type: "HS BLS Skills Check",
          message: e instanceof Error ? e.message : "Sheet fetch failed",
        });
      }
    })(),
  ]);

  all.sort((a, b) => parseUsDate(b.dateLabel) - parseUsDate(a.dateLabel));

  const forAudit = all.filter((c) => !shouldHideInstructorCourseRow(c.raw));

  return {
    courses: forAudit,
    fetchedAt: new Date().toISOString(),
    fetchErrors,
  };
}

export { INSTRUCTOR_TAB_EDIT_URL };
