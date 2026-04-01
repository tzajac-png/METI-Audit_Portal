import { NextResponse } from "next/server";
import { getAuditSessionValid } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await getAuditSessionValid();
  return NextResponse.json({ authenticated });
}
