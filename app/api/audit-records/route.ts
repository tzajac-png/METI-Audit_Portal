import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuditSessionValid } from "@/lib/auth";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
  isAuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";
import { serverlessBlobGuardResponse } from "@/lib/serverless-blob-guard";
import {
  createAuditRecord,
  deleteAuditRecord,
  getAuditRecordById,
  getUploadsDir,
  listAuditRecords,
  sanitizeStoredFileName,
  updateAuditRecord,
  type EcardFileMeta,
} from "@/lib/audit-records-store";

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
  const records = await listAuditRecords();
  return NextResponse.json({
    records,
    auditors: AUDITOR_OPTIONS,
    complianceLabels: COMPLIANCE_FIELD_LABELS,
  });
}

async function parseEcardUpload(
  file: File,
): Promise<EcardFileMeta | NextResponse> {
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
  const storedName = `${path.basename(storedBase)}`;

  if (isInstructorBlobStorageConfigured()) {
    const blobPath = `audit-uploads/${storedName}`;
    const blob = await put(blobPath, buf, {
      access: "private",
      contentType: mime,
      addRandomSuffix: true,
      ...blobReadWriteOptions(),
    });
    return {
      originalName: file.name,
      mimeType: mime,
      size: buf.length,
      blobUrl: blob.url,
    };
  }

  const dir = getUploadsDir();
  fs.writeFileSync(path.join(dir, storedName), buf);
  return {
    originalName: file.name,
    storedName,
    mimeType: mime,
    size: buf.length,
  };
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

  const file = form.get("ecardFile");
  let newEcardMeta: EcardFileMeta | null = null;
  if (file instanceof File && file.size > 0) {
    const parsed = await parseEcardUpload(file);
    if (parsed instanceof NextResponse) return parsed;
    newEcardMeta = parsed;
  }

  const baseInput = {
    courseCode,
    courseDateLabel: courseDateLabel || "—",
    courseLocation: courseLocation || "—",
    leadInstructor: leadInstructor || "—",
    auditorName,
    compliance,
    notes,
    ecardFile: null as EcardFileMeta | null,
  };

  if (recordId) {
    const existing = await getAuditRecordById(recordId);
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    let ecardFile: EcardFileMeta | null = existing.ecardFile;
    if (newEcardMeta) {
      if (existing.ecardFile) {
        if (isInstructorBlobStorageConfigured() && existing.ecardFile.blobUrl) {
          try {
            await del(existing.ecardFile.blobUrl, blobReadWriteOptions());
          } catch {
            /* ignore */
          }
        } else if (existing.ecardFile.storedName) {
          try {
            fs.unlinkSync(
              path.join(getUploadsDir(), existing.ecardFile.storedName),
            );
          } catch {
            /* ignore */
          }
        }
      }
      ecardFile = newEcardMeta;
    }

    try {
      const rec = await updateAuditRecord(recordId, {
        ...baseInput,
        ecardFile,
      });
      if (!rec) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
      return NextResponse.json({ record: rec });
    } catch (e) {
      if (newEcardMeta?.blobUrl) {
        try {
          await del(newEcardMeta.blobUrl, blobReadWriteOptions());
        } catch {
          /* ignore */
        }
      }
      throw e;
    }
  }

  const ecardFile = newEcardMeta;

  try {
    const rec = await createAuditRecord({
      ...baseInput,
      ecardFile,
    });
    return NextResponse.json({ record: rec });
  } catch (e) {
    if (ecardFile?.blobUrl) {
      try {
        await del(ecardFile.blobUrl, blobReadWriteOptions());
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
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
