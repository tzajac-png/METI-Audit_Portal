import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUDIT_COOKIE = "audit_session";
const METI_BLS_ADMIN_COOKIE = "meti_bls_admin_session";
const DASHBOARD_COOKIE = "dashboard_session";

const ALIGNED_BASE = "/aligned-instructors-admin";
const ALIGNED_LOGIN = "/aligned-instructors-admin/login";

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
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(auditSecret),
      );
      if (payload.role !== "audit") {
        return NextResponse.redirect(new URL("/audit/login", request.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/audit/login", request.url));
    }
  }

  if (pathname.startsWith(ALIGNED_BASE)) {
    const auditSecret = process.env.AUDIT_SECRET;

    if (!auditSecret || auditSecret.length < 16) {
      return NextResponse.redirect(new URL(ALIGNED_LOGIN, request.url));
    }

    if (pathname.startsWith(ALIGNED_LOGIN)) {
      const metiToken = request.cookies.get(METI_BLS_ADMIN_COOKIE)?.value;
      if (
        metiToken &&
        (await metiBlsAdminTokenValid(metiToken, auditSecret))
      ) {
        return NextResponse.redirect(new URL(ALIGNED_BASE, request.url));
      }
      return NextResponse.next();
    }

    const metiToken = request.cookies.get(METI_BLS_ADMIN_COOKIE)?.value;
    if (
      metiToken &&
      (await metiBlsAdminTokenValid(metiToken, auditSecret))
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(ALIGNED_LOGIN, request.url));
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
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload.role === "audit";
  } catch {
    return false;
  }
}

async function metiBlsAdminTokenValid(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload.role === "meti_bls_admin";
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
