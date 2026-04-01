import type { CourseType } from "@/lib/course";

/** Student Sign Up 2026 workbook — instructor tabs per program */
export const INSTRUCTOR_SPREADSHEET_ID =
  "1J9OO6YGdwnArcVn_K8CUHQHwOiIAeQj2vZcpyIbWWTE";

export const INSTRUCTOR_TAB_EDIT_URL: Record<CourseType, string> = {
  BLS: `https://docs.google.com/spreadsheets/d/${INSTRUCTOR_SPREADSHEET_ID}/edit?gid=89421864#gid=89421864`,
  ACLS: `https://docs.google.com/spreadsheets/d/${INSTRUCTOR_SPREADSHEET_ID}/edit?gid=190493285#gid=190493285`,
  PALS: `https://docs.google.com/spreadsheets/d/${INSTRUCTOR_SPREADSHEET_ID}/edit?gid=547470971#gid=547470971`,
  Heartsaver: `https://docs.google.com/spreadsheets/d/${INSTRUCTOR_SPREADSHEET_ID}/edit?gid=1227957035#gid=1227957035`,
};

/** Default tab gids (overridable via env per type) */
export const DEFAULT_INSTRUCTOR_GID: Record<CourseType, string> = {
  BLS: "89421864",
  ACLS: "190493285",
  PALS: "547470971",
  Heartsaver: "1227957035",
};
