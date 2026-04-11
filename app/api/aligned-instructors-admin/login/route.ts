import { NextResponse } from "next/server";
import {
  METI_BLS_ADMIN_SESSION_COOKIE,
  signMetiBlsAdminSession,
} from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/request-cookie-secure";

/** Used when `METI_BLS_ADMIN_PASSWORD` is not set. Override via env in production if needed. */
const DEFAULT_ALIGNED_INSTRUCTORS_PASSWORD = "METIADMIN2026!";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expected =
    process.env.METI_BLS_ADMIN_PASSWORD?.trim() ||
    DEFAULT_ALIGNED_INSTRUCTORS_PASSWORD;

  const submitted = typeof body.password === "string" ? body.password : "";
  if (!submitted || submitted !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  try {
    const token = await signMetiBlsAdminSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(METI_BLS_ADMIN_SESSION_COOKIE, token, {
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
