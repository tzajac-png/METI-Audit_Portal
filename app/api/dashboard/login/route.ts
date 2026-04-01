import { NextResponse } from "next/server";
import {
  DASHBOARD_SESSION_COOKIE,
  signDashboardSession,
} from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/request-cookie-secure";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  const expected = process.env.DASHBOARD_PASSWORD?.trim();
  if (!expected || expected.length < 1) {
    return NextResponse.json(
      { error: "Dashboard password is not configured." },
      { status: 500 },
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  try {
    const token = await signDashboardSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(DASHBOARD_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(request),
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Session signing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
