import type { DirectoryRow } from "@/lib/student-directory";

const EMAIL_KEYS = [
  "Email Address",
  "Email",
  "E-mail",
] as const;

export function pickDirectoryEmail(row: DirectoryRow): string {
  for (const k of EMAIL_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(row)) {
    if (/email/i.test(k) && v?.trim()) return v.trim();
  }
  return "";
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Single URL segment (base64url) — safe for dynamic routes. Prefer email; else name + phone.
 */
export function encodeDirectoryStudentId(row: DirectoryRow): string {
  const email = pickDirectoryEmail(row);
  if (email) {
    const payload = `e:${normalizeEmail(email)}`;
    return Buffer.from(payload, "utf8").toString("base64url");
  }
  const payload = `n:${JSON.stringify({
    fn: (row["First Name"] ?? "").trim(),
    ln: (row["Last Name"] ?? "").trim(),
    ph: (row["Phone Number"] ?? row["Phone"] ?? "").trim(),
  })}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

export type DecodedDirectoryId =
  | { kind: "email"; email: string }
  | { kind: "compound"; fn: string; ln: string; ph: string };

export function decodeDirectoryStudentId(segment: string): DecodedDirectoryId | null {
  try {
    const raw = Buffer.from(segment, "base64url").toString("utf8");
    if (raw.startsWith("e:")) {
      return { kind: "email", email: normalizeEmail(raw.slice(2)) };
    }
    if (raw.startsWith("n:")) {
      const o = JSON.parse(raw.slice(2)) as {
        fn: string;
        ln: string;
        ph: string;
      };
      return { kind: "compound", fn: o.fn, ln: o.ln, ph: o.ph };
    }
  } catch {
    return null;
  }
  return null;
}

export function findDirectoryRowByDecodedId(
  rows: DirectoryRow[],
  decoded: DecodedDirectoryId,
): DirectoryRow | undefined {
  if (decoded.kind === "email") {
    return rows.find(
      (r) => normalizeEmail(pickDirectoryEmail(r)) === decoded.email,
    );
  }
  return rows.find((r) => {
    const fn = (r["First Name"] ?? "").trim();
    const ln = (r["Last Name"] ?? "").trim();
    const ph = (r["Phone Number"] ?? r["Phone"] ?? "").trim();
    return (
      fn === decoded.fn && ln === decoded.ln && ph === decoded.ph
    );
  });
}

/** Name keys for signup tabs (may vary slightly). */
const FIRST_KEYS = ["First Name", "First", "Given Name"] as const;
const LAST_KEYS = ["Last Name", "Last", "Surname", "Family Name"] as const;

function pickFirst(row: Record<string, string>): string {
  for (const k of FIRST_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  return "";
}

function pickLast(row: Record<string, string>): string {
  for (const k of LAST_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  return "";
}

function pickSignupEmail(row: Record<string, string>): string {
  for (const k of EMAIL_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith("_")) continue;
    if (/email/i.test(k) && v?.trim()) return v.trim();
  }
  return "";
}

/**
 * True if a signup/roster row is the same person as the directory row (email, or name+phone).
 */
export function directoryRowMatchesSignupRow(
  directory: DirectoryRow,
  signup: Record<string, string>,
): boolean {
  const de = normalizeEmail(pickDirectoryEmail(directory));
  const se = normalizeEmail(pickSignupEmail(signup));
  if (de && se && de === se) return true;

  const dfn = (directory["First Name"] ?? "").trim().toLowerCase();
  const dln = (directory["Last Name"] ?? "").trim().toLowerCase();
  const sfn = pickFirst(signup).toLowerCase();
  const sln = pickLast(signup).toLowerCase();
  if (dfn && dln && sfn && sln && dfn === sfn && dln === sln) {
    const dph = (
      directory["Phone Number"] ??
      directory["Phone"] ??
      ""
    )
      .replace(/\D/g, "");
    const sph = (
      signup["Phone Number"] ??
      signup["Phone"] ??
      ""
    )
      .replace(/\D/g, "");
    if (dph.length >= 10 && dph === sph) return true;
    if (!dph && !sph) return true;
  }
  return false;
}
