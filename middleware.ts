import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUDIT_COOKIE = "audit_session";
const DASHBOARD_COOKIE = "dashboard_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/audit")) {
    const auditSecret = process.env.AUDIT_SECRET;

    if (pathname.startsWith("/audit/login")) {
      const auditToken = request.cookies.get(AUDIT_COOKIE)?.value;
      if (
        auditSecret &&
        auditSecret.length >= 16 &&
        auditToken &&
        (await auditTokenValid(auditToken, auditSecret))
      ) {
        return NextResponse.redirect(new URL("/audit/courses", request.url));
      }
      return NextResponse.next();
    }

    const token = request.cookies.get(AUDIT_COOKIE)?.value;

    if (!auditSecret || auditSecret.length < 16 || !token) {
      return NextResponse.redirect(new URL("/audit/login", request.url));
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(auditSecret));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/audit/login", request.url));
    }
  }

  const dashSecret = process.env.AUDIT_SECRET;

  if (pathname === "/login") {
    const dashToken = request.cookies.get(DASHBOARD_COOKIE)?.value;
    if (
      dashSecret &&
      dashSecret.length >= 16 &&
      dashToken &&
      (await dashboardTokenValid(dashToken, dashSecret))
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const dashToken = request.cookies.get(DASHBOARD_COOKIE)?.value;

  if (!dashSecret || dashSecret.length < 16 || !dashToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(
      dashToken,
      new TextEncoder().encode(dashSecret),
    );
    if (!isDashboardRole(payload)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

function isDashboardRole(payload: { role?: unknown } | import("jose").JWTPayload): boolean {
  return payload.role === "dashboard";
}

async function dashboardTokenValid(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return isDashboardRole(payload);
  } catch {
    return false;
  }
}

async function auditTokenValid(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
