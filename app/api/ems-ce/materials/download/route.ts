import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDashboardSessionValid } from "@/lib/auth";
import { readCloudObject } from "@/lib/cloud-storage";
import { getEmsCeMaterialById } from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_DIR = path.join(process.cwd(), "data", "ems-ce-files");

export async function GET(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const material = await getEmsCeMaterialById(id);
  if (!material?.file) {
    return NextResponse.json({ error: "No file" }, { status: 404 });
  }

  const meta = material.file;
  const filename = meta.originalName.replace(/[^\w.\- ()]/g, "_");

  if (meta.storageKey) {
    const buf = await readCloudObject(meta.storageKey);
    if (!buf) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (!meta.storedName) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const filePath = path.join(LOCAL_DIR, meta.storedName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
