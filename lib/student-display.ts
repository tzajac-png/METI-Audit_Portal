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

/** Class roster table / PDF — same header fallbacks as ACLS/PALS Google Form exports. */
export const ROSTER_FIRST_NAME_KEYS = [
  "First Name",
  "First",
  "Given Name",
] as const;
export const ROSTER_LAST_NAME_KEYS = [
  "Last Name",
  "Last",
  "Surname",
  "Family Name",
] as const;
export const ROSTER_EMAIL_KEYS = [
  "Email Address",
  "Email",
  "E-mail",
] as const;
export const ROSTER_CLASS_DATE_KEYS = [
  "Class Date",
  "Course Date",
  "Date of Class",
] as const;
export const ROSTER_SCORE_KEYS = [
  "Score",
  "Test Score",
  "Exam Score",
] as const;
export const ROSTER_PHONE_KEYS = [
  "Phone Number",
  "Phone",
  "Mobile",
  "Contact Phone",
] as const;

/** Stable row id when Response ID exists */
export const STABLE_ROW_RESPONSE_ID_KEYS = ["Response ID"] as const;

export const STUDENT_DETAIL_FIELDS_ORDER: StudentDetailFieldSpec[] = [
  {
    label: "First name",
    headerKeys: [...ROSTER_FIRST_NAME_KEYS],
  },
  {
    label: "Last name",
    headerKeys: [...ROSTER_LAST_NAME_KEYS],
  },
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
  { label: "Email", headerKeys: [...ROSTER_EMAIL_KEYS] },
  { label: "Status", headerKeys: ["Status"], statusHighlight: "complete" },
  { label: "Class date", headerKeys: [...ROSTER_CLASS_DATE_KEYS] },
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
