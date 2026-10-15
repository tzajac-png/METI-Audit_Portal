import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDashboardSessionValid } from "@/lib/auth";
import {
  isRemoteCloudStorageConfigured,
  writeCloudObject,
} from "@/lib/cloud-storage";
import { serverlessStorageGuardResponse } from "@/lib/serverless-storage-guard";
import {
  addEmsCeClassPaperwork,
  buildEmsCeStoredFileName,
  removeEmsCeClassPaperwork,
} from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), "data", "ems-ce-files");

export async function POST(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const blocked = serverlessStorageGuardResponse();
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const classId = String(form.get("classId") ?? "").trim();
  const label = String(form.get("label") ?? "").trim();
  const file = form.get("file");

  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const storedName = buildEmsCeStoredFileName(file.name);

  try {
    let storageKey: string | undefined;
    let localName: string | undefined;
    if (isRemoteCloudStorageConfigured()) {
      storageKey = `ems-ce/classes/${classId}/${storedName}`;
      await writeCloudObject(storageKey, buf, mime);
    } else {
      const dir = path.join(LOCAL_DIR, classId);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, storedName), buf);
      localName = `${classId}/${storedName}`;
    }

    const cls = await addEmsCeClassPaperwork(classId, {
      originalName: file.name,
      mimeType: mime,
      size: buf.length,
      storageKey,
      storedName: localName,
      label: label || undefined,
    });
    return NextResponse.json({ class: cls });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
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

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId")?.trim() ?? "";
  const fileId = searchParams.get("fileId")?.trim() ?? "";
  if (!classId || !fileId) {
    return NextResponse.json(
      { error: "classId and fileId are required" },
      { status: 400 },
    );
  }

  const cls = await removeEmsCeClassPaperwork(classId, fileId);
  if (!cls) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ class: cls });
}
