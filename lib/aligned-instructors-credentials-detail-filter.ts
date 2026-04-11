/**
 * Columns to hide on the aligned-instructor credentials detail view
 * (Document Studio automation + form response metadata).
 */
export function isOmittedFromCredentialsDetailHeader(header: string): boolean {
  const k = header.trim();
  if (/^\[DOCUMENT STUDIO\]/i.test(k)) return true;
  if (/^response edit url$/i.test(k)) return true;
  if (/^response id$/i.test(k)) return true;
  return false;
}
