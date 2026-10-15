import { NextResponse } from "next/server";
import { getDashboardSessionValid } from "@/lib/auth";
import { serverlessStorageGuardResponse } from "@/lib/serverless-storage-guard";
import {
  deleteEmsCeStateSubmission,
  EMS_CE_STATE_STATUSES,
  listEmsCeStateSubmissions,
  upsertEmsCeStateSubmission,
  type EmsCeStateStatus,
} from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const submissions = await listEmsCeStateSubmissions();
  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
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
  const status = String(o.status ?? "draft") as EmsCeStateStatus;
  if (!(EMS_CE_STATE_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const submission = await upsertEmsCeStateSubmission({
      id: String(o.id ?? "").trim() || undefined,
      courseTitle: String(o.courseTitle ?? "").trim(),
      courseDate: String(o.courseDate ?? "").trim(),
      hours: String(o.hours ?? "").trim(),
      instructor: String(o.instructor ?? "").trim(),
      submittedToStateAt: String(o.submittedToStateAt ?? "").trim(),
      status,
      confirmationNumber: String(o.confirmationNumber ?? "").trim(),
      notes: String(o.notes ?? "").trim(),
    });
    return NextResponse.json({ submission });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const blocked = serverlessStorageGuardResponse();
  if (blocked) return blocked;

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const removed = await deleteEmsCeStateSubmission(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
