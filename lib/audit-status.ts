import { complianceCompleteRatio, emptyCompliance } from "@/lib/audit-constants";
import { getLatestAuditForCourse } from "@/lib/audit-records-store";

const COMPLIANCE_TOTAL = Object.keys(emptyCompliance()).length;

export type AuditDisplayStatus = {
  status: "Complete" | "Pending";
  auditedAt: string | null;
  auditorName: string | null;
  complianceDone: number;
  complianceTotal: number;
};

/**
 * Matches the “All classes — audit status” table: Complete when the latest
 * audit record has every compliance checkbox set.
 */
export async function getAuditDisplayStatus(
  courseCode: string,
): Promise<AuditDisplayStatus> {
  const rec = await getLatestAuditForCourse(courseCode.trim());
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
