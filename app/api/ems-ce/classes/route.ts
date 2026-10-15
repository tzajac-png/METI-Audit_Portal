import { NextResponse } from "next/server";
import { getDashboardSessionValid } from "@/lib/auth";
import { serverlessStorageGuardResponse } from "@/lib/serverless-storage-guard";
import {
  deleteEmsCeClass,
  EMS_CE_CLASS_STATUSES,
  listEmsCeClasses,
  upsertEmsCeClass,
  type EmsCeClassStatus,
} from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const classes = await listEmsCeClasses();
  return NextResponse.json({ classes });
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
  const status = String(o.status ?? "planning") as EmsCeClassStatus;
  if (!(EMS_CE_CLASS_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const cls = await upsertEmsCeClass({
      id: String(o.id ?? "").trim() || undefined,
      title: String(o.title ?? "").trim(),
      courseDate: String(o.courseDate ?? "").trim(),
      location: String(o.location ?? "").trim(),
      instructor: String(o.instructor ?? "").trim(),
      hours: String(o.hours ?? "").trim(),
      status,
      notes: String(o.notes ?? "").trim(),
    });
    return NextResponse.json({ class: cls });
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
  const removed = await deleteEmsCeClass(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
