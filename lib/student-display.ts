/**
 * Ordered fields for BLS student detail. Values are resolved from spreadsheet
 * columns using the first matching header name.
 */
export type StudentDetailFieldSpec = {
  label: string;
  /** Try these header names in order (exact match to exported CSV headers) */
  headerKeys: string[];
  /** Status shows green when value matches (case-insensitive) */
  statusHighlight?: "complete";
};

export const STUDENT_DETAIL_FIELDS_ORDER: StudentDetailFieldSpec[] = [
  { label: "First name", headerKeys: ["First Name"] },
  { label: "Last name", headerKeys: ["Last Name"] },
  {
    label: "Student number",
    headerKeys: ["Student Number", "Student ID", "Student #", "Student No."],
  },
  {
    label: "Address",
    headerKeys: [
      "Address",
      "Street Address",
      "Mailing Address",
      "Your Address",
    ],
  },
  { label: "City", headerKeys: ["City"] },
  { label: "State", headerKeys: ["State", "State/Province", "Region"] },
  {
    label: "Zip",
    headerKeys: ["Zip", "ZIP", "Zip Code", "Postal Code", "Zip/Postal Code"],
  },
  { label: "Country", headerKeys: ["Country"] },
  { label: "Email", headerKeys: ["Email Address", "Email"] },
  { label: "Status", headerKeys: ["Status"], statusHighlight: "complete" },
  { label: "Class date", headerKeys: ["Class Date"] },
  {
    label: "Course instructor",
    headerKeys: [
      "Course Instructor",
      "Instructor",
      "Lead Instructor",
      "Class Instructor",
    ],
  },
  { label: "Place", headerKeys: ["Place", "Location", "Course Location", "Venue"] },
];

export function pickStudentField(
  row: Record<string, string>,
  headerKeys: string[],
): string {
  for (const key of headerKeys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  const rowLower = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    rowLower.set(k.toLowerCase().trim(), v);
  }
  for (const key of headerKeys) {
    const v = rowLower.get(key.toLowerCase().trim());
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export function isStatusComplete(value: string): boolean {
  return value.trim().toLowerCase() === "complete";
}
