/**
 * Columns and cell values to hide on aligned-instructor credential views
 * (Document Studio automation + form response metadata).
 */

export function isOmittedFromCredentialsDetailHeader(header: string): boolean {
  const k = header.trim();
  if (/^\[DOCUMENT STUDIO\]/i.test(k)) return true;
  if (/document studio/i.test(k)) return true;
  if (/^response\s*edit\s*url$/i.test(k)) return true;
  if (/response\s*edit\s*url/i.test(k)) return true;
  if (/^response\s*id$/i.test(k)) return true;
  return false;
}

/** Values that are automation noise even if the column title is odd. */
export function isOmittedFromCredentialsDetailValue(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/^open in google drive$/i.test(v)) return true;
  if (/^email sent to\b/i.test(v)) return true;
  /** Google Forms internal response id */
  if (/^2_[A-Za-z0-9_-]{20,}$/.test(v)) return true;
  return false;
}

export function isOmittedFromCredentialsDetailCell(
  header: string,
  value: string,
): boolean {
  if (isOmittedFromCredentialsDetailHeader(header)) return true;
  if (isOmittedFromCredentialsDetailValue(value)) return true;
  return false;
}
