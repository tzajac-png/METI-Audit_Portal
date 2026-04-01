import { normalizeEmail } from "@/lib/directory-helpers";
import type { InstructorDirectoryRow } from "@/lib/instructor-directory";

const EMAIL_KEYS = [
  "Email",
  "Email Address",
  "E-mail",
  "Work Email",
] as const;

const NAME_KEYS = [
  "Name",
  "Full Name",
  "Instructor Name",
  "Instructor",
] as const;

export function pickInstructorEmail(row: InstructorDirectoryRow): string {
  for (const k of EMAIL_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(row)) {
    if (/email/i.test(k) && v?.trim()) return v.trim();
  }
  return "";
}

export function pickInstructorName(row: InstructorDirectoryRow): string {
  for (const k of NAME_KEYS) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(row)) {
    if (/^name$/i.test(k.trim()) && v?.trim()) return v.trim();
  }
  const entries = Object.entries(row);
  if (entries.length === 0) return "";
  const [, firstCell] = entries[0];
  const v = firstCell?.trim() ?? "";
  if (v && !/^https?:\/\//i.test(v)) return v;
  return "";
}

export function pickInstructorPhone(row: InstructorDirectoryRow): string {
  for (const k of ["Phone", "Phone Number", "Cell", "Mobile"] as const) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(row)) {
    if (/phone|mobile|cell/i.test(k) && v?.trim()) return v.trim();
  }
  return "";
}

export function encodeInstructorId(row: InstructorDirectoryRow): string {
  const email = pickInstructorEmail(row);
  if (email) {
    const payload = `e:${normalizeEmail(email)}`;
    return Buffer.from(payload, "utf8").toString("base64url");
  }
  const name = pickInstructorName(row);
  const phone = pickInstructorPhone(row);
  const payload = `n:${JSON.stringify({ name, phone })}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

export type DecodedInstructorId =
  | { kind: "email"; email: string }
  | { kind: "compound"; name: string; phone: string };

export function decodeInstructorId(segment: string): DecodedInstructorId | null {
  try {
    const raw = Buffer.from(segment, "base64url").toString("utf8");
    if (raw.startsWith("e:")) {
      return { kind: "email", email: normalizeEmail(raw.slice(2)) };
    }
    if (raw.startsWith("n:")) {
      const o = JSON.parse(raw.slice(2)) as { name: string; phone: string };
      return { kind: "compound", name: o.name, phone: o.phone ?? "" };
    }
  } catch {
    return null;
  }
  return null;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function findInstructorRowByDecodedId(
  rows: InstructorDirectoryRow[],
  decoded: DecodedInstructorId,
): InstructorDirectoryRow | undefined {
  if (decoded.kind === "email") {
    return rows.find(
      (r) => normalizeEmail(pickInstructorEmail(r)) === decoded.email,
    );
  }
  const wantPhone = digitsOnly(decoded.phone);
  return rows.find((r) => {
    const name = pickInstructorName(r);
    const ph = digitsOnly(pickInstructorPhone(r));
    if (name !== decoded.name.trim()) return false;
    if (wantPhone.length >= 7) return ph === wantPhone;
    return decoded.phone.trim() === pickInstructorPhone(r).trim();
  });
}
