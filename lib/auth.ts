import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "audit_session";

function getSecretBytes(): Uint8Array | null {
  const s = process.env.AUDIT_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function signAuditSession(): Promise<string> {
  const secret = getSecretBytes();
  if (!secret) {
    throw new Error(
      "AUDIT_SECRET must be set (at least 16 characters) for audit session signing.",
    );
  }
  return new SignJWT({ role: "audit" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyAuditSessionToken(token: string): Promise<boolean> {
  const secret = getSecretBytes();
  if (!secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

const DASHBOARD_COOKIE = "dashboard_session";

export async function signDashboardSession(): Promise<string> {
  const secret = getSecretBytes();
  if (!secret) {
    throw new Error(
      "AUDIT_SECRET must be set (at least 16 characters) for session signing.",
    );
  }
  return new SignJWT({ role: "dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyDashboardSessionToken(token: string): Promise<boolean> {
  const secret = getSecretBytes();
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "dashboard";
  } catch {
    return false;
  }
}

export { COOKIE as AUDIT_SESSION_COOKIE, DASHBOARD_COOKIE as DASHBOARD_SESSION_COOKIE };

/** Valid dashboard (main portal) session cookie. */
export async function getDashboardSessionValid(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(DASHBOARD_COOKIE)?.value;
  if (!token) return false;
  return verifyDashboardSessionToken(token);
}

/** True when the audit login cookie is present and valid (for API routes). */
export async function getAuditSessionValid(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  return verifyAuditSessionToken(token);
}
