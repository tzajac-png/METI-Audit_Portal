import { Buffer } from "node:buffer";

/**
 * Encode course code as a single path segment: lowercase hex (case-safe for CDNs
 * and hosts that normalize URL casing — base64url is case-sensitive and can break).
 *
 * Uses Unicode NFKC + trim so encoded URLs align with PALS roster matching
 * (normalized course codes on the server).
 */
export function encodeCoursePathSegment(code: string): string {
  const normalized = code.trim().normalize("NFKC");
  return Buffer.from(normalized, "utf8").toString("hex");
}

/**
 * Decode segment from View links: hex (current), then base64url (older deploys),
 * or null if neither applies (caller may fall back to URI decoding).
 */
export function decodeCoursePathSegment(segment: string): string | null {
  const raw = segment?.trim() ?? "";
  if (!raw) return null;

  const hexCandidate = raw.replace(/^0x/i, "").toLowerCase();
  if (
    /^[0-9a-f]+$/.test(hexCandidate) &&
    hexCandidate.length >= 2 &&
    hexCandidate.length % 2 === 0
  ) {
    try {
      const decoded = Buffer.from(hexCandidate, "hex").toString("utf8").trim();
      if (decoded.length > 0) return decoded;
    } catch {
      /* try base64url */
    }
  }

  try {
    const fromB64 = Buffer.from(raw, "base64url").toString("utf8").trim();
    if (fromB64.length > 0) return fromB64;
  } catch {
    /* ignore */
  }
  return null;
}
