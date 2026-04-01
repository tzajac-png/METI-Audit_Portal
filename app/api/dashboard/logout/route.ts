import { NextResponse } from "next/server";
import { DASHBOARD_SESSION_COOKIE } from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/request-cookie-secure";

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DASHBOARD_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
  return res;
}
