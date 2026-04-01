import path from "path";

export function sanitizeStoredFileName(original: string): string {
  const base = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 120) || "upload.bin";
}
