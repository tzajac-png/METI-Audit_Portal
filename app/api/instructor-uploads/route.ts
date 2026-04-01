import { NextResponse } from "next/server";
import fs from "fs";
import { getDashboardSessionValid } from "@/lib/auth";
import {
  appendUpload,
  buildStoredFileName,
  CREDENTIAL_EXPIRATION_CATEGORIES,
  filePathForStoredName,
  listUploadsForInstructor,
  removeUploadEntry,
  setCredentialExpiration,
  type InstructorUploadCategory,
} from "@/lib/instructor-uploads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXPIRABLE = new Set<InstructorUploadCategory>(
  CREDENTIAL_EXPIRATION_CATEGORIES,
);

const VALID_CATEGORIES = new Set<InstructorUploadCategory>([
  "bls_provider_card",
  "bls_instructor",
  "acls_provider",
  "acls_instructor",
  "pals_provider",
  "pals_instructor",
  "tri_agreement",
  "initial_monitoring",
  "initial_application_bls",
  "initial_application_acls",
  "initial_application_pals",
  "monitoring_paperwork_log",
]);

export async function GET(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get("instructorId")?.trim() ?? "";
  if (!instructorId) {
    return NextResponse.json(
      { error: "instructorId is required" },
      { status: 400 },
    );
  }

  const { uploads, expirations } = listUploadsForInstructor(instructorId);
  return NextResponse.json({ uploads, expirations });
}

export async function PATCH(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const instructorId = String(
    (body as { instructorId?: string }).instructorId ?? "",
  ).trim();
  const category = String(
    (body as { category?: string }).category ?? "",
  ).trim() as InstructorUploadCategory;
  const rawExp = (body as { expirationDate?: string | null }).expirationDate;
  const expirationDate =
    rawExp === null || rawExp === undefined
      ? null
      : String(rawExp).trim() || null;

  if (!instructorId) {
    return NextResponse.json(
      { error: "instructorId is required" },
      { status: 400 },
    );
  }
  if (!EXPIRABLE.has(category)) {
    return NextResponse.json(
      { error: "Invalid category for expiration" },
      { status: 400 },
    );
  }

  try {
    setCredentialExpiration(instructorId, category, expirationDate);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const instructorId = String(form.get("instructorId") ?? "").trim();
  const category = String(form.get("category") ?? "").trim() as InstructorUploadCategory;

  if (!instructorId) {
    return NextResponse.json(
      { error: "instructorId is required" },
      { status: 400 },
    );
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      {
        error:
          "File must be PDF, Word document, or image (PNG, JPEG, WebP)",
      },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storedName = buildStoredFileName(file.name);
  const dest = filePathForStoredName(instructorId, storedName);
  fs.writeFileSync(dest, buf);

  const entry = appendUpload(instructorId, category, {
    originalName: file.name,
    storedName,
    mimeType: mime,
    size: buf.length,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get("instructorId")?.trim() ?? "";
  const entryId = searchParams.get("entryId")?.trim() ?? "";

  if (!instructorId || !entryId) {
    return NextResponse.json(
      { error: "instructorId and entryId are required" },
      { status: 400 },
    );
  }

  const removed = removeUploadEntry(instructorId, entryId);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
