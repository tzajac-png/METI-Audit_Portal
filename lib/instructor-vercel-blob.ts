/**
 * Instructor uploads on Vercel cannot use the local `data/` disk (read-only FS).
 * When BLOB_READ_WRITE_TOKEN is set (Vercel Blob), uploads go to Blob instead.
 */
export function isInstructorBlobStorageConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

/** Pass to `@vercel/blob` `put`/`get`/`del` so the token is always explicit at runtime. */
export function getBlobReadWriteToken(): string | undefined {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return t || undefined;
}

/** Use when blob storage is configured; throws if the env var is missing. */
export function blobReadWriteOptions(): { token: string } {
  const token = getBlobReadWriteToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
  }
  return { token };
}
