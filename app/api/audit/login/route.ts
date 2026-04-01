import { NextResponse } from "next/server";
import { AUDIT_SESSION_COOKIE, signAuditSession } from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/request-cookie-secure";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expected = process.env.AUDIT_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Server is not configured (AUDIT_PASSWORD)." },
      { status: 500 },
    );
  }

  const submitted =
    typeof body.password === "string" ? body.password.trim() : "";
  if (!submitted || submitted !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  try {
    const token = await signAuditSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUDIT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: shouldUseSecureCookie(request),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Session error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
