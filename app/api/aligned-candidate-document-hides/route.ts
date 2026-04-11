import { NextResponse } from "next/server";
import { getAlignedInstructorsOrAuditSessionValid } from "@/lib/auth";
import {
  getHiddenCandidateDocumentRowKeys,
  hideCandidateDocumentRowKey,
} from "@/lib/aligned-candidate-document-hides-store";
import { serverlessBlobGuardResponse } from "@/lib/serverless-blob-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const hidden = await getHiddenCandidateDocumentRowKeys();
  return NextResponse.json({ hiddenRowKeys: [...hidden] });
}

export async function POST(request: Request) {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = serverlessBlobGuardResponse();
  if (blocked) return blocked;

  let body: { rowKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rowKey = String(body.rowKey ?? "").trim();
  if (!rowKey) {
    return NextResponse.json({ error: "rowKey is required" }, { status: 400 });
  }

  try {
    await hideCandidateDocumentRowKey(rowKey);
    const hidden = await getHiddenCandidateDocumentRowKeys();
    return NextResponse.json({ ok: true, hiddenRowKeys: [...hidden] });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not update hidden documents.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
