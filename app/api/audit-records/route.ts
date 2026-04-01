import { NextResponse } from "next/server";
import { getAuditSessionValid } from "@/lib/auth";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
  isAuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import {
  createAuditRecord,
  deleteAuditRecord,
  getUploadsDir,
  listAuditRecords,
  sanitizeStoredFileName,
  type EcardFileMeta,
} from "@/lib/audit-records-store";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep ≤4 MB for typical serverless request limits (raise if your host allows). */
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function GET() {
  const ok = await getAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    records: listAuditRecords(),
    auditors: AUDITOR_OPTIONS,
    complianceLabels: COMPLIANCE_FIELD_LABELS,
  });
}

export async function POST(request: Request) {
  const ok = await getAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const courseCode = String(form.get("courseCode") ?? "").trim();
  const auditorName = String(form.get("auditorName") ?? "").trim();
  const notes = String(form.get("notes") ?? "");
  const courseDateLabel = String(form.get("courseDateLabel") ?? "").trim();
  const courseLocation = String(form.get("courseLocation") ?? "").trim();
  const leadInstructor = String(form.get("leadInstructor") ?? "").trim();

  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
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

  let ecardFile: EcardFileMeta | null = null;
  const file = form.get("ecardFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 400 },
      );
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: "File must be PDF or image (PNG, JPEG, WebP)" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const storedBase = `${Date.now()}-${sanitizeStoredFileName(file.name)}`;
    const dir = getUploadsDir();
    const storedName = `${path.basename(storedBase)}`;
    fs.writeFileSync(path.join(dir, storedName), buf);
    ecardFile = {
      originalName: file.name,
      storedName,
      mimeType: mime,
      size: buf.length,
    };
  }

  const rec = createAuditRecord({
    courseCode,
    courseDateLabel: courseDateLabel || "—",
    courseLocation: courseLocation || "—",
    leadInstructor: leadInstructor || "—",
    auditorName,
    compliance,
    notes,
    ecardFile,
  });

  return NextResponse.json({ record: rec });
}

export async function DELETE(request: Request) {
  const ok = await getAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const removed = deleteAuditRecord(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
