import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDashboardSessionValid } from "@/lib/auth";
import { readCloudObject } from "@/lib/cloud-storage";
import { getEmsCeClassById } from "@/lib/ems-ce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_DIR = path.join(process.cwd(), "data", "ems-ce-files");

export async function GET(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId")?.trim() ?? "";
  const fileId = searchParams.get("fileId")?.trim() ?? "";
  if (!classId || !fileId) {
    return NextResponse.json(
      { error: "classId and fileId are required" },
      { status: 400 },
    );
  }

  const cls = await getEmsCeClassById(classId);
  const meta = cls?.paperwork.find((f) => f.id === fileId);
  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
