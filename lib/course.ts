import {
  pickStudentField,
  ROSTER_EMAIL_KEYS,
  STABLE_ROW_RESPONSE_ID_KEYS,
} from "@/lib/student-display";

export const COURSE_TYPES = ["BLS", "ACLS", "PALS", "Heartsaver"] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

/**
 * Infer course family from CourseCode / PendingCourseID (e.g. "BLS|20260222|Name").
 */
export function inferCourseType(courseCode: string): CourseType | "Other" {
  const raw = courseCode.trim();
  if (!raw) return "Other";
  const segment = raw.split("|")[0]?.trim().toUpperCase() ?? "";
  const token = segment.split(/[\s\-_/]/)[0] ?? "";

  if (token.startsWith("BLS") || token === "BLS") return "BLS";
  if (token.startsWith("ACLS") || token === "ACLS") return "ACLS";
  if (token.startsWith("PALS") || token === "PALS") return "PALS";
  if (
    token.startsWith("HEARTSAVER") ||
    token.startsWith("HS") ||
    token === "HEARTSAVER"
  ) {
    return "Heartsaver";
  }

  return "Other";
}

export function stableRowId(row: Record<string, string>): string {
  const responseId = pickStudentField(row, [...STABLE_ROW_RESPONSE_ID_KEYS]);
  if (responseId) return `rid:${responseId}`;
  const email = pickStudentField(row, [...ROSTER_EMAIL_KEYS]);
  const ts = pickStudentField(row, ["Timestamp"]);
  return `e:${email}|t:${ts}`;
}
