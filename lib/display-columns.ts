/** Preferred column order when present in the sheet. */
export const PREFERRED_COLUMNS = [
  "Timestamp",
  "Email Address",
  "First Name",
  "Last Name",
  "Score",
  "CourseCode",
  "PendingCourseID",
  "Class Date",
  "Course Instructors",
  "Course Location",
  "Student Number",
  "Status",
] as const;

export function pickDisplayColumns(headers: string[]): string[] {
  const set = new Set(headers);
  const ordered: string[] = [];
  for (const c of PREFERRED_COLUMNS) {
    if (set.has(c)) ordered.push(c);
  }
  for (const h of headers) {
    if (h.startsWith("_")) continue;
    if (!ordered.includes(h)) ordered.push(h);
  }
  return ordered;
}
