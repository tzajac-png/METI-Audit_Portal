import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getDashboardSessionValid } from "@/lib/auth";
import {
  isRemoteCloudStorageConfigured,
  writeCloudObject,
} from "@/lib/cloud-storage";
import { serverlessStorageGuardResponse } from "@/lib/serverless-storage-guard";
import {
  buildEmsCeStoredFileName,
  deleteEmsCeMaterial,
  listEmsCeMaterials,
  upsertEmsCeMaterial,
} from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), "data", "ems-ce-files");

export async function GET() {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const materials = await listEmsCeMaterials();
  return NextResponse.json({ materials });
}

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

  const id = String(form.get("id") ?? "").trim() || undefined;
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const file = form.get("file");

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  let fileMeta:
    | {
        id: string;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: string;
        storageKey?: string;
        storedName?: string;
      }
    | null
    | undefined = undefined;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const storedName = buildEmsCeStoredFileName(file.name);
    if (isRemoteCloudStorageConfigured()) {
      const storageKey = `ems-ce/materials/${storedName}`;
      await writeCloudObject(storageKey, buf, mime);
      fileMeta = {
        id: randomUUID(),
        originalName: file.name,
        mimeType: mime,
        size: buf.length,
        uploadedAt: new Date().toISOString(),
        storageKey,
      };
    } else {
      fs.mkdirSync(LOCAL_DIR, { recursive: true });
      fs.writeFileSync(path.join(LOCAL_DIR, storedName), buf);
      fileMeta = {
        id: randomUUID(),
        originalName: file.name,
        mimeType: mime,
        size: buf.length,
        uploadedAt: new Date().toISOString(),
        storedName,
      };
    }
  }

  try {
    const material = await upsertEmsCeMaterial({
      id,
      title,
      category,
      notes,
      ...(fileMeta !== undefined ? { file: fileMeta } : {}),
    });
    return NextResponse.json({ material });
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
  const removed = await deleteEmsCeMaterial(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
