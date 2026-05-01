/**
 * pdf-lib StandardFonts only encode WinAnsi. Non‑encodable characters throw at runtime.
 * Normalize common punctuation and replace remaining unsupported code points.
 */
export function sanitizeForPdfStandardFont(text: string): string {
  if (!text) return "";
  const s = text
    .replace(/\ufeff/g, "")
    .replace(/[\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp === 9 || cp === 10 || cp === 13) {
      out += ch;
      continue;
    }
    if (cp >= 32 && cp <= 126) {
      out += ch;
      continue;
    }
    // Latin-1 supplement (names like José) — usually encodable as WinAnsi
    if (cp >= 160 && cp <= 255) {
      out += ch;
      continue;
    }
    out += "?";
  }
  return out;
}
