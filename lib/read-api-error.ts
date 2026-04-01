/**
 * Parse JSON `{ error?: string }` or plain text/HTML from failed `fetch` responses.
 * Always includes HTTP status when the server does not return a clear message.
 */
export async function readApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const statusHint = res.status ? ` [HTTP ${res.status}]` : "";
  const ct = res.headers.get("content-type") ?? "";

  const raw = await res.text().catch(() => "");

  if (ct.includes("application/json") && raw.trim()) {
    try {
      const j = JSON.parse(raw) as { error?: unknown; message?: unknown };
      const err =
        typeof j.error === "string"
          ? j.error.trim()
          : typeof j.message === "string"
            ? String(j.message).trim()
            : "";
      if (err) return err;
    } catch {
      return raw.trim().slice(0, 600) || `${fallback}${statusHint}`;
    }
    return `${fallback}${statusHint}`;
  }

  const t = raw.trim();
  if (t) return t.slice(0, 800);
  return `${fallback}${statusHint}`;
}
