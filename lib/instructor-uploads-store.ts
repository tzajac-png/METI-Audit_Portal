import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { deleteCloudObject } from "@/lib/cloud-storage";
import { createManifestStore } from "@/lib/manifest-store";
import { sanitizeStoredFileName } from "@/lib/sanitize-filename";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_ROOT = path.join(DATA_DIR, "instructor-uploads-files");
const CLOUD_MANIFEST_KEY = "instructor-uploads/__manifest.json";

export type InstructorUploadCategory =
  | "bls_provider_card"
  | "bls_instructor"
  | "acls_provider"
  | "acls_instructor"
  | "pals_provider"
  | "pals_instructor"
  | "tri_agreement"
  | "initial_monitoring"
  | "initial_application_bls"
  | "initial_application_acls"
  | "initial_application_pals"
  | "monitoring_paperwork_log";

/** Categories that support portal-managed expiration (YYYY-MM-DD). */
export const CREDENTIAL_EXPIRATION_CATEGORIES: InstructorUploadCategory[] = [
  "bls_provider_card",
  "bls_instructor",
  "acls_provider",
  "acls_instructor",
  "pals_provider",
  "pals_instructor",
];

export type InstructorUploadEntry = {
  id: string;
  originalName: string;
  /** Local disk filename under data/instructor-uploads-files/ (dev or non-Vercel hosts). */
  storedName?: string;
  /** Backblaze B2 object key (production). */
  storageKey?: string;
  /** @deprecated Legacy Vercel Blob URL — no longer written. */
  blobUrl?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type InstructorBucket = {
  uploads: Partial<
    Record<InstructorUploadCategory, InstructorUploadEntry[]>
  >;
  expirations: Partial<
    Record<InstructorUploadCategory, string | null>
  >;
};

type LegacyBucket = Partial<
  Record<InstructorUploadCategory, InstructorUploadEntry[]>
>;

type StoreFile = {
  byInstructor: Record<string, InstructorBucket | LegacyBucket>;
};

function isLegacyBucket(
  raw: InstructorBucket | LegacyBucket,
): raw is LegacyBucket {
  if (!raw || typeof raw !== "object") return false;
  if ("uploads" in raw && raw.uploads) return false;
  return true;
}

function normalizeBucket(
  raw: InstructorBucket | LegacyBucket | undefined,
): InstructorBucket {
  if (!raw) return { uploads: {}, expirations: {} };
  if (!isLegacyBucket(raw)) {
    return {
      uploads: { ...raw.uploads },
      expirations: { ...raw.expirations },
    };
  }
  return { uploads: { ...raw }, expirations: {} };
}

function normalizeStoreFile(data: StoreFile): StoreFile {
  const normalized: StoreFile = {
    byInstructor: {},
  };
  for (const [id, b] of Object.entries(data.byInstructor)) {
    normalized.byInstructor[id] = normalizeBucket(b);
  }
  return normalized;
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "byInstructor" in data &&
    typeof (data as StoreFile).byInstructor === "object"
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "instructor-uploads.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ byInstructor: {} }),
  normalize: normalizeStoreFile,
  isValid: isStoreFile,
});

function safeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "id";
}

export function getInstructorUploadsDir(instructorId: string): string {
  const dir = path.join(UPLOADS_ROOT, safeSegment(instructorId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function listUploadsForInstructor(instructorId: string): Promise<{
  uploads: Partial<Record<InstructorUploadCategory, InstructorUploadEntry[]>>;
  expirations: Partial<Record<InstructorUploadCategory, string | null>>;
}> {
  const store = await manifest.read();
  const b = normalizeBucket(store.byInstructor[instructorId]);
  return {
    uploads: { ...b.uploads },
    expirations: { ...b.expirations },
  };
}

export async function getUploadEntry(
  instructorId: string,
  entryId: string,
): Promise<
  { entry: InstructorUploadEntry; category: InstructorUploadCategory } | null
> {
  const store = await manifest.read();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  for (const [cat, list] of Object.entries(bucket.uploads) as [
    InstructorUploadCategory,
    InstructorUploadEntry[],
  ][]) {
    const entry = list?.find((e) => e.id === entryId);
    if (entry) return { entry, category: cat };
  }
  return null;
}

/**
 * Removes one upload entry and deletes the file on disk when `storedName` is set.
 * Caller deletes the cloud object when `storageKey` is set.
 */
export async function removeUploadEntry(
  instructorId: string,
  entryId: string,
): Promise<InstructorUploadEntry | null> {
  const store = await manifest.read();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  let removed: InstructorUploadEntry | null = null;

  for (const cat of Object.keys(bucket.uploads) as InstructorUploadCategory[]) {
    const list = bucket.uploads[cat];
    if (!list?.length) continue;
    const idx = list.findIndex((e) => e.id === entryId);
    if (idx === -1) continue;
    const [entry] = list.splice(idx, 1);
    removed = entry;
    if (entry?.storedName) {
      try {
        fs.unlinkSync(filePathForStoredName(instructorId, entry.storedName));
      } catch {
        /* ignore missing file */
      }
    }
    if (list.length === 0) {
      delete bucket.uploads[cat];
    } else {
      bucket.uploads[cat] = list;
    }
    break;
  }

  if (!removed) return null;
  store.byInstructor[instructorId] = bucket;
  await manifest.write(store);
  return removed;
}

export async function appendUpload(
  instructorId: string,
  category: InstructorUploadCategory,
  meta: Omit<InstructorUploadEntry, "id" | "uploadedAt">,
): Promise<InstructorUploadEntry> {
  const entry: InstructorUploadEntry = {
    ...meta,
    id: randomUUID(),
    uploadedAt: new Date().toISOString(),
  };
  const store = await manifest.read();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  const list = bucket.uploads[category] ?? [];
  list.push(entry);
  bucket.uploads[category] = list;
  store.byInstructor[instructorId] = bucket;
  await manifest.write(store);
  return entry;
}

export async function setCredentialExpiration(
  instructorId: string,
  category: InstructorUploadCategory,
  expirationDate: string | null,
): Promise<void> {
  if (!CREDENTIAL_EXPIRATION_CATEGORIES.includes(category)) {
    throw new Error("Expiration not supported for this category");
  }
  const trimmed = expirationDate?.trim() ?? "";
  if (trimmed !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Expiration must be YYYY-MM-DD");
  }
  const store = await manifest.read();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  if (trimmed === "") {
    delete bucket.expirations[category];
  } else {
    bucket.expirations[category] = trimmed;
  }
  store.byInstructor[instructorId] = bucket;
  await manifest.write(store);
}

export function filePathForStoredName(
  instructorId: string,
  storedName: string,
): string {
  return path.join(getInstructorUploadsDir(instructorId), storedName);
}

export function buildStoredFileName(originalName: string): string {
  const base = `${Date.now()}-${sanitizeStoredFileName(originalName)}`;
  return path.basename(base);
}

export async function deleteUploadStorage(
  entry: InstructorUploadEntry,
): Promise<void> {
  if (entry.storageKey) {
    await deleteCloudObject(entry.storageKey);
  }
}
