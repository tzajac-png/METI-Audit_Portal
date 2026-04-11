export const AUDITOR_OPTIONS = ["Tyler Zajac", "Ben Bonathan"] as const;
export type AuditorName = (typeof AUDITOR_OPTIONS)[number];

export function isAuditorName(s: string): s is AuditorName {
  return (AUDITOR_OPTIONS as readonly string[]).includes(s);
}

/** Labels for compliance checklist (BLS course audit) */
export const COMPLIANCE_FIELD_LABELS: Record<keyof ComplianceChecklist, string> = {
  rosterComplete: "Roster complete & matches class",
  instructorCredentialsVerified: "Lead instructor credentials verified",
  courseDocumentsCompliant: "Course documents on file / compliant",
  studentRecordsComplete: "Student records complete in spreadsheet",
};

export type ComplianceChecklist = {
  rosterComplete: boolean;
  instructorCredentialsVerified: boolean;
  courseDocumentsCompliant: boolean;
  studentRecordsComplete: boolean;
};

export function emptyCompliance(): ComplianceChecklist {
  return {
    rosterComplete: false,
    instructorCredentialsVerified: false,
    courseDocumentsCompliant: false,
    studentRecordsComplete: false,
  };
}

/** Drop unknown/legacy keys (e.g. removed checklist items) when loading stored JSON. */
export function normalizeCompliance(
  raw: Partial<Record<keyof ComplianceChecklist, boolean>> | null | undefined,
): ComplianceChecklist {
  const e = emptyCompliance();
  if (!raw || typeof raw !== "object") return e;
  for (const k of Object.keys(e) as (keyof ComplianceChecklist)[]) {
    if (typeof raw[k] === "boolean") e[k] = raw[k];
  }
  return e;
}

export function complianceCompleteRatio(c: ComplianceChecklist): {
  done: number;
  total: number;
} {
  const vals = Object.values(c);
  const done = vals.filter(Boolean).length;
  return { done, total: vals.length };
}
