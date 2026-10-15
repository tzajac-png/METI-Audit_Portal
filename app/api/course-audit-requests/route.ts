import { NextResponse } from "next/server";
import {
  getAuditSessionValid,
  getDashboardSessionValid,
} from "@/lib/auth";
import { isAuditRecordComplete } from "@/lib/audit-status";
import { getLatestAuditForCourses } from "@/lib/audit-records-store";
import { serverlessStorageGuardResponse } from "@/lib/serverless-storage-guard";
import {
  getCourseAuditRequest,
  listCourseAuditRequests,
  removeCourseAuditRequest,
  upsertCourseAuditRequest,
  type CourseAuditRequest,
} from "@/lib/course-audit-requests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function openRequests(): Promise<CourseAuditRequest[]> {
  const requests = await listCourseAuditRequests();
  if (requests.length === 0) return [];

  const codes = requests.map((r) => r.courseCode);
  const latest = await getLatestAuditForCourses(codes);
  const open: CourseAuditRequest[] = [];

  for (const req of requests) {
    const rec = latest.get(req.courseCode) ?? null;
    if (isAuditRecordComplete(rec)) {
      await removeCourseAuditRequest(req.courseCode);
      continue;
    }
    open.push(req);
  }

  return open.sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

/** List open audit requests (audit login) or status for one course (dashboard login). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseCode = searchParams.get("courseCode")?.trim() ?? "";

  if (courseCode) {
    const dashboardOk = await getDashboardSessionValid();
    if (!dashboardOk) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const req = await getCourseAuditRequest(courseCode);
    const latest = await getLatestAuditForCourses([courseCode]);
    const rec = latest.get(courseCode) ?? null;
    const auditComplete = isAuditRecordComplete(rec);
    if (auditComplete && req) {
      await removeCourseAuditRequest(courseCode);
    }
    return NextResponse.json({
      auditComplete,
      requested: !!req && !auditComplete,
      requestedAt: req && !auditComplete ? req.requestedAt : null,
    });
  }

  const auditOk = await getAuditSessionValid();
  if (!auditOk) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const requests = await openRequests();
  return NextResponse.json({ requests });
}

/** Submit an audit request from a course detail page (dashboard login). */
export async function POST(request: Request) {
  const dashboardOk = await getDashboardSessionValid();
  if (!dashboardOk) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = serverlessStorageGuardResponse();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const courseCode = String(o.courseCode ?? "").trim();
  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
  }

  const latest = await getLatestAuditForCourses([courseCode]);
  const rec = latest.get(courseCode) ?? null;
  if (isAuditRecordComplete(rec)) {
    await removeCourseAuditRequest(courseCode);
    return NextResponse.json(
      { error: "This class already has a complete audit." },
      { status: 409 },
    );
  }

  const req = await upsertCourseAuditRequest({
    courseCode,
    programTitle: String(o.programTitle ?? "").trim() || "—",
    courseDateLabel: String(o.courseDateLabel ?? "").trim() || "—",
    courseLocation: String(o.courseLocation ?? "").trim() || "—",
    leadInstructor: String(o.leadInstructor ?? "").trim() || "—",
  });

  return NextResponse.json({ request: req });
}
