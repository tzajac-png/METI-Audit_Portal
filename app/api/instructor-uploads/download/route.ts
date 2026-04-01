import { NextResponse } from "next/server";
import fs from "fs";
import { getDashboardSessionValid } from "@/lib/auth";
import {
  filePathForStoredName,
  getUploadEntry,
} from "@/lib/instructor-uploads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const found = getUploadEntry(instructorId, entryId);
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { entry } = found;
  if (!entry.storedName) {
    return NextResponse.json(
      { error: "This file is not stored on the server" },
      { status: 404 },
    );
  }
  const filePath = filePathForStoredName(instructorId, entry.storedName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const filename = entry.originalName.replace(/[^\w.\- ()]/g, "_");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": entry.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
