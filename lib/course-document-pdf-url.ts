/**
 * Normalize common Google Drive / Docs URLs to something we can fetch as a file.
 * Publicly shared files may still return HTML (virus scan interstitial); caller handles that.
 */
export function normalizeCourseDocumentFetchUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname.toLowerCase();
  if (
    host !== "drive.google.com" &&
    host !== "docs.google.com" &&
    !host.endsWith(".googleusercontent.com")
  ) {
    // Allow direct PDF/CDN links
    if (raw.toLowerCase().endsWith(".pdf")) return u.toString();
    return null;
  }

  if (host === "drive.google.com") {
    const openId = u.searchParams.get("id");
    if (u.pathname.includes("/file/d/")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(m[1])}`;
      }
    }
    if (openId) {
      return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(openId)}`;
    }
  }

  if (host === "docs.google.com" && u.pathname.includes("/document/d/")) {
    const m = u.pathname.match(/\/document\/d\/([^/]+)/);
    if (m?.[1]) {
      return `https://docs.google.com/document/d/${encodeURIComponent(m[1])}/export?format=pdf`;
    }
  }

  return u.toString();
}

export function isAllowedCourseDocumentHost(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return (
      h === "drive.google.com" ||
      h === "docs.google.com" ||
      h.endsWith(".googleusercontent.com") ||
      u.pathname.toLowerCase().endsWith(".pdf")
    );
  } catch {
    return false;
  }
}
