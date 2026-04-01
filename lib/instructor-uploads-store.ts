import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sanitizeStoredFileName } from "@/lib/audit-records-store";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "instructor-uploads.json");
const UPLOADS_ROOT = path.join(DATA_DIR, "instructor-uploads-files");

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
  /** Set when the file is on this server (required for new uploads). */
  storedName?: string;
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

function readStore(): StoreFile {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.byInstructor && typeof parsed.byInstructor === "object") {
      return parsed;
    }
  } catch {
    /* empty */
  }
  return { byInstructor: {} };
}

function writeStore(data: StoreFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const normalized: StoreFile = {
    byInstructor: {},
  };
  for (const [id, b] of Object.entries(data.byInstructor)) {
    normalized.byInstructor[id] = normalizeBucket(b);
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(normalized, null, 2), "utf8");
}

function safeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "id";
}

export function getInstructorUploadsDir(instructorId: string): string {
  const dir = path.join(UPLOADS_ROOT, safeSegment(instructorId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function listUploadsForInstructor(instructorId: string): {
  uploads: Partial<Record<InstructorUploadCategory, InstructorUploadEntry[]>>;
  expirations: Partial<Record<InstructorUploadCategory, string | null>>;
} {
  const store = readStore();
  const b = normalizeBucket(store.byInstructor[instructorId]);
  return {
    uploads: { ...b.uploads },
    expirations: { ...b.expirations },
  };
}

export function getUploadEntry(
  instructorId: string,
  entryId: string,
): { entry: InstructorUploadEntry; category: InstructorUploadCategory } | null {
  const store = readStore();
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
 * @returns true if an entry was removed
 */
export function removeUploadEntry(
  instructorId: string,
  entryId: string,
): boolean {
  const store = readStore();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  let found = false;

  for (const cat of Object.keys(bucket.uploads) as InstructorUploadCategory[]) {
    const list = bucket.uploads[cat];
    if (!list?.length) continue;
    const idx = list.findIndex((e) => e.id === entryId);
    if (idx === -1) continue;
    const [removed] = list.splice(idx, 1);
    found = true;
    if (removed?.storedName) {
      try {
        fs.unlinkSync(filePathForStoredName(instructorId, removed.storedName));
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

  if (!found) return false;
  store.byInstructor[instructorId] = bucket;
  writeStore(store);
  return true;
}

export function appendUpload(
  instructorId: string,
  category: InstructorUploadCategory,
  meta: Omit<InstructorUploadEntry, "id" | "uploadedAt">,
): InstructorUploadEntry {
  const entry: InstructorUploadEntry = {
    ...meta,
    id: randomUUID(),
    uploadedAt: new Date().toISOString(),
  };
  const store = readStore();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  const list = bucket.uploads[category] ?? [];
  list.push(entry);
  bucket.uploads[category] = list;
  store.byInstructor[instructorId] = bucket;
  writeStore(store);
  return entry;
}

export function setCredentialExpiration(
  instructorId: string,
  category: InstructorUploadCategory,
  expirationDate: string | null,
): void {
  if (!CREDENTIAL_EXPIRATION_CATEGORIES.includes(category)) {
    throw new Error("Expiration not supported for this category");
  }
  const trimmed = expirationDate?.trim() ?? "";
  if (trimmed !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Expiration must be YYYY-MM-DD");
  }
  const store = readStore();
  const bucket = normalizeBucket(store.byInstructor[instructorId]);
  if (trimmed === "") {
    delete bucket.expirations[category];
  } else {
    bucket.expirations[category] = trimmed;
  }
  store.byInstructor[instructorId] = bucket;
  writeStore(store);
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
