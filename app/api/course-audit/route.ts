import { NextResponse } from "next/server";
import { getAuditDisplayStatus } from "@/lib/audit-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only: compliance-based audit status for a course (same rules as Course audits dashboard). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseCode = searchParams.get("courseCode")?.trim() ?? "";
  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
  }
  const s = getAuditDisplayStatus(courseCode);
  return NextResponse.json({
    auditStatus: s.status,
    auditedAt: s.auditedAt,
    auditorName: s.auditorName,
    complianceDone: s.complianceDone,
    complianceTotal: s.complianceTotal,
  });
}
