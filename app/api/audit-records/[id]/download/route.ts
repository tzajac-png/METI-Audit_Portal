import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuditSessionValid } from "@/lib/auth";
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
  const rec = getAuditRecordById(id);
  if (!rec?.ecardFile) {
    return NextResponse.json({ error: "No file for this audit" }, { status: 404 });
  }

  const meta = rec.ecardFile;
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
  const filename = meta.originalName.replace(/[^\w.\- ()]/g, "_");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
