import {
  complianceCompleteRatio,
  emptyCompliance,
} from "@/lib/audit-constants";
import {
  getLatestAuditForCourse,
  getLatestAuditForCourses,
  type AuditRecord,
} from "@/lib/audit-records-store";

const COMPLIANCE_TOTAL = Object.keys(emptyCompliance()).length;

export type AuditDisplayStatus = {
  status: "Complete" | "Pending";
  auditedAt: string | null;
  auditorName: string | null;
  complianceDone: number;
  complianceTotal: number;
};

export function isAuditRecordComplete(rec: AuditRecord | null): boolean {
  if (!rec) return false;
  const r = complianceCompleteRatio(rec.compliance);
  return r.done === r.total;
}

function auditRecordToDisplay(rec: AuditRecord | null): AuditDisplayStatus {
  if (!rec) {
    return {
      status: "Pending",
      auditedAt: null,
      auditorName: null,
      complianceDone: 0,
      complianceTotal: COMPLIANCE_TOTAL,
    };
  }
  const r = complianceCompleteRatio(rec.compliance);
  return {
    status: r.done === r.total ? "Complete" : "Pending",
    auditedAt: rec.auditedAt,
    auditorName: rec.auditorName,
    complianceDone: r.done,
    complianceTotal: r.total,
  };
}

/**
 * Matches the “All classes — audit status” table: Complete when the latest
 * audit record has every compliance checkbox set.
 */
export async function getAuditDisplayStatus(
  courseCode: string,
): Promise<AuditDisplayStatus> {
  const rec = await getLatestAuditForCourse(courseCode.trim());
  return auditRecordToDisplay(rec);
}

/**
 * Build status for many classes with a single audit store read (course list pages).
 */
export async function getAuditDisplayStatusForCodes(
  courseCodes: string[],
): Promise<Record<string, AuditDisplayStatus>> {
  if (courseCodes.length === 0) return {};
  const unique = [...new Set(courseCodes.map((c) => c.trim()).filter(Boolean))];
  const latest = await getLatestAuditForCourses(unique);
  const out: Record<string, AuditDisplayStatus> = {};
  for (const original of courseCodes) {
    const key = original.trim();
    const rec = key ? (latest.get(key) ?? null) : null;
    out[original] = auditRecordToDisplay(rec);
  }
  return out;
}
