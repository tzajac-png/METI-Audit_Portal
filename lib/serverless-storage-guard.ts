import { NextResponse } from "next/server";
import { isRemoteCloudStorageConfigured } from "@/lib/cloud-storage";

const HELP =
  "Cloud storage is not configured for production. Add Backblaze B2 credentials (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT) under Vercel → Settings → Environment Variables, then redeploy. Local dev uses the data/ folder when B2 is not set.";

/**
 * Vercel serverless functions cannot write to `data/` on disk. Uploads and
 * saved JSON manifests require Backblaze B2 when `VERCEL` is set.
 */
export function serverlessStorageGuardResponse(): NextResponse | null {
  if (!process.env.VERCEL) return null;
  if (isRemoteCloudStorageConfigured()) return null;
  return NextResponse.json({ error: HELP }, { status: 503 });
}

/** @deprecated Use {@link serverlessStorageGuardResponse}. */
export function serverlessBlobGuardResponse(): NextResponse | null {
  return serverlessStorageGuardResponse();
}
