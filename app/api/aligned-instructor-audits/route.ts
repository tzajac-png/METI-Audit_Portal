import { NextResponse } from "next/server";
import {
  getAlignedInstructorsOrAuditSessionValid,
} from "@/lib/auth";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
  isAuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import { serverlessBlobGuardResponse } from "@/lib/serverless-blob-guard";
import { stripAlignedBoilerplateFromSnapshot } from "@/lib/aligned-instructor-snapshot-filter";
import {
  createAlignedInstructorAuditRecord,
  deleteAlignedInstructorAudit,
  getAlignedInstructorAuditById,
  listAlignedInstructorAuditRecords,
  updateAlignedInstructorAuditRecord,
} from "@/lib/aligned-instructor-audit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const records = await listAlignedInstructorAuditRecords();
  return NextResponse.json({
    records,
    auditors: AUDITOR_OPTIONS,
    complianceLabels: COMPLIANCE_FIELD_LABELS,
  });
}

export async function POST(request: Request) {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = serverlessBlobGuardResponse();
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  try {
    const recordId = String(form.get("recordId") ?? "").trim();
    const rowKey = String(form.get("rowKey") ?? "").trim();
    const displayLabel = String(form.get("displayLabel") ?? "").trim();
    const snapshotRaw = String(form.get("rowSnapshotJson") ?? "").trim();
    const auditorName = String(form.get("auditorName") ?? "").trim();
    const notes = String(form.get("notes") ?? "");

    if (!rowKey) {
      return NextResponse.json({ error: "rowKey is required" }, { status: 400 });
    }
    if (!isAuditorName(auditorName)) {
      return NextResponse.json(
        { error: `auditorName must be one of: ${AUDITOR_OPTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    let rowSnapshot: Record<string, string>;
    try {
      const parsed = JSON.parse(snapshotRaw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json(
          { error: "Invalid rowSnapshotJson" },
          { status: 400 },
        );
      }
      rowSnapshot = stripAlignedBoilerplateFromSnapshot(
        Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === "string" ? v : String(v ?? ""),
          ]),
        ),
      );
    } catch {
      return NextResponse.json(
        { error: "Invalid rowSnapshotJson" },
        { status: 400 },
      );
    }

    const compliance: ComplianceChecklist = { ...emptyCompliance() };
    (Object.keys(compliance) as (keyof ComplianceChecklist)[]).forEach((key) => {
      const v = form.get(`compliance_${key}`);
      compliance[key] = v === "true" || v === "on" || v === "1";
    });

    const baseInput = {
      rowKey,
      displayLabel: displayLabel || "—",
      rowSnapshot,
      auditorName,
      compliance,
      notes,
    };

    if (recordId) {
      const existing = await getAlignedInstructorAuditById(recordId);
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
      const rec = await updateAlignedInstructorAuditRecord(recordId, baseInput);
      if (!rec) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
      return NextResponse.json({ record: rec });
    }

    const rec = await createAlignedInstructorAuditRecord(baseInput);
    return NextResponse.json({ record: rec });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not save aligned instructor audit.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = serverlessBlobGuardResponse();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const removed = await deleteAlignedInstructorAudit(id);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not delete audit record.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
