/**
 * Next.js [dynamic] segments are usually decoded once. Calling decodeURIComponent
 * again throws URIError for values that contain a literal "%" (e.g. "25%").
 * Never swallow that as 404 — fall back to the raw segment.
 */
export function safeDecodePathSegment(segment: string): string {
  if (!segment) return segment;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
