import { NextResponse } from "next/server";
import { getAuditSessionValid } from "@/lib/auth";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
  isAuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import { serverlessBlobGuardResponse } from "@/lib/serverless-blob-guard";
import {
  createAuditRecord,
  deleteAuditRecord,
  getAuditRecordById,
  listAuditRecords,
  updateAuditRecord,
} from "@/lib/audit-records-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const records = await listAuditRecords();
  return NextResponse.json({
    records,
    auditors: AUDITOR_OPTIONS,
    complianceLabels: COMPLIANCE_FIELD_LABELS,
  });
}

export async function POST(request: Request) {
  const ok = await getAuditSessionValid();
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
    const courseCode = String(form.get("courseCode") ?? "").trim();
    const auditorName = String(form.get("auditorName") ?? "").trim();
    const notes = String(form.get("notes") ?? "");
    const courseDateLabel = String(form.get("courseDateLabel") ?? "").trim();
    const courseLocation = String(form.get("courseLocation") ?? "").trim();
    const leadInstructor = String(form.get("leadInstructor") ?? "").trim();

    if (!courseCode) {
      return NextResponse.json(
        { error: "courseCode is required" },
        { status: 400 },
      );
    }
    if (!isAuditorName(auditorName)) {
      return NextResponse.json(
        { error: `auditorName must be one of: ${AUDITOR_OPTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const compliance: ComplianceChecklist = { ...emptyCompliance() };
    (Object.keys(compliance) as (keyof ComplianceChecklist)[]).forEach((key) => {
      const v = form.get(`compliance_${key}`);
      compliance[key] = v === "true" || v === "on" || v === "1";
    });

    const baseInput = {
      courseCode,
      courseDateLabel: courseDateLabel || "—",
      courseLocation: courseLocation || "—",
      leadInstructor: leadInstructor || "—",
      auditorName,
      compliance,
      notes,
    };

    if (recordId) {
      const existing = await getAuditRecordById(recordId);
      if (!existing) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }

      const rec = await updateAuditRecord(recordId, {
        ...baseInput,
        ecardFile: existing.ecardFile,
      });
      if (!rec) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
      return NextResponse.json({ record: rec });
    }

    const rec = await createAuditRecord({
      ...baseInput,
      ecardFile: null,
    });
    return NextResponse.json({ record: rec });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not save audit record.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const ok = await getAuditSessionValid();
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
    const removed = await deleteAuditRecord(id);
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
