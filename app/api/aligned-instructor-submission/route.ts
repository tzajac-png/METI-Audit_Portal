import { NextResponse } from "next/server";
import { getAlignedInstructorsOrAuditSessionValid } from "@/lib/auth";
import { serverlessBlobGuardResponse } from "@/lib/serverless-blob-guard";
import type { AlignedPortalSubmissionStatus } from "@/lib/aligned-instructor-submission-types";
import {
  getAlignedSubmissionMap,
  markAlignedSubmissionOpened,
  setAlignedSubmissionStatus,
} from "@/lib/aligned-instructor-submission-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: AlignedPortalSubmissionStatus[] = [
  "reviewed",
  "payment_collected_submitted_cards",
  "holding_class_payment",
  "cards_issued",
];

function isStatus(s: string): s is AlignedPortalSubmissionStatus {
  return (STATUSES as string[]).includes(s);
}

export async function GET() {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const map = await getAlignedSubmissionMap();
  const entries = [...map.values()];
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const ok = await getAlignedInstructorsOrAuditSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = serverlessBlobGuardResponse();
  if (blocked) return blocked;

  let body: { rowKey?: string; action?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rowKey = String(body.rowKey ?? "").trim();
  if (!rowKey) {
    return NextResponse.json({ error: "rowKey is required" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  if (action === "open") {
    try {
      const entry = await markAlignedSubmissionOpened(rowKey);
      return NextResponse.json({ entry });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not update submission state.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === "set_status") {
    const status = String(body.status ?? "").trim();
    if (!isStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    try {
      const entry = await setAlignedSubmissionStatus(rowKey, status);
      return NextResponse.json({ entry });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not update submission state.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
