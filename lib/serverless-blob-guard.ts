import { NextResponse } from "next/server";

const HELP =
  "Vercel Blob is not configured. In the Vercel dashboard: open your project → Storage → Blob → create or connect a store (this adds BLOB_READ_WRITE_TOKEN to the project). Or add BLOB_READ_WRITE_TOKEN under Settings → Environment Variables for Production, then redeploy.";

/**
 * Vercel serverless functions cannot write to `data/` on disk. Uploads and
 * saved JSON manifests require Vercel Blob when `VERCEL` is set.
 *
 * Returns a JSON 503 response when storage cannot work, otherwise `null`.
 */
export function serverlessBlobGuardResponse(): NextResponse | null {
  if (!process.env.VERCEL) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  return NextResponse.json({ error: HELP }, { status: 503 });
}
