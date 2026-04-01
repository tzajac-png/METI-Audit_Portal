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
  const email = row["Email Address"] ?? "";
  const ts = row["Timestamp"] ?? "";
  const responseId = row["Response ID"] ?? "";
  if (responseId) return `rid:${responseId}`;
  return `e:${email}|t:${ts}`;
}
