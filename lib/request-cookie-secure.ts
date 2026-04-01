/**
 * Use Secure cookies only when the client connection is HTTPS (or proxied as such).
 * NODE_ENV-based secure breaks logins on plain HTTP (e.g. localhost with `next start`).
 */
export function shouldUseSecureCookie(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded === "https") return true;
  if (forwarded === "http") return false;
  return new URL(request.url).protocol === "https:";
}
