import { NextResponse } from "next/server";
import { METI_BLS_ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/request-cookie-secure";

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(METI_BLS_ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
