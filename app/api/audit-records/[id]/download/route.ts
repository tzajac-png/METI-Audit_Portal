import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuditSessionValid } from "@/lib/auth";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";
import { getAuditRecordById, getUploadsDir } from "@/lib/audit-records-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const ok = await getAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const rec = await getAuditRecordById(id);
  if (!rec?.ecardFile) {
    return NextResponse.json({ error: "No file for this audit" }, { status: 404 });
  }

  const meta = rec.ecardFile;
  const filename = meta.originalName.replace(/[^\w.\- ()]/g, "_");

  if (meta.blobUrl && isInstructorBlobStorageConfigured()) {
    const result = await get(meta.blobUrl, {
      access: "private",
      ...blobReadWriteOptions(),
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (!meta.storedName) {
    return NextResponse.json(
      { error: "This attachment is not stored on the server" },
      { status: 404 },
    );
  }
  const filePath = path.join(getUploadsDir(), meta.storedName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  const buf = fs.readFileSync(filePath);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
