import fs from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import type {
  AlignedPortalSubmissionStatus,
  AlignedSubmissionEntry,
} from "@/lib/aligned-instructor-submission-types";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";

export type {
  AlignedPortalSubmissionStatus,
  AlignedSubmissionEntry,
} from "@/lib/aligned-instructor-submission-types";

export {
  ALIGNED_PORTAL_SUBMISSION_LABELS,
} from "@/lib/aligned-instructor-submission-types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "aligned-instructor-submissions.json");
const BLOB_MANIFEST_PATHNAME = "aligned-instructor-submissions/__manifest.json";

type StoreFile = {
  entries: AlignedSubmissionEntry[];
};

function normalizeEntry(raw: AlignedSubmissionEntry): AlignedSubmissionEntry {
  return { ...raw };
}

async function readStoreData(): Promise<StoreFile> {
  if (isInstructorBlobStorageConfigured()) {
    try {
      const result = await get(BLOB_MANIFEST_PATHNAME, {
        access: "private",
        ...blobReadWriteOptions(),
      });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return { entries: [] };
      }
      const raw = Buffer.from(
        await new Response(result.stream).arrayBuffer(),
      ).toString("utf8");
      const parsed = JSON.parse(raw) as StoreFile;
      if (parsed?.entries && Array.isArray(parsed.entries)) {
        return {
          entries: parsed.entries.map((e) =>
            normalizeEntry(e as AlignedSubmissionEntry),
          ),
        };
      }
    } catch {
      /* missing */
    }
    return { entries: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.entries && Array.isArray(parsed.entries)) {
      return {
        entries: parsed.entries.map((e) =>
          normalizeEntry(e as AlignedSubmissionEntry),
        ),
      };
    }
  } catch {
    /* empty */
  }
  return { entries: [] };
}

async function writeStoreData(data: StoreFile): Promise<void> {
  const normalized: StoreFile = {
    entries: data.entries.map((e) => normalizeEntry(e)),
  };

  if (isInstructorBlobStorageConfigured()) {
    await put(BLOB_MANIFEST_PATHNAME, JSON.stringify(normalized, null, 2), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
      addRandomSuffix: false,
      ...blobReadWriteOptions(),
    });
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(normalized, null, 2), "utf8");
}

export async function getAlignedSubmissionMap(): Promise<
  Map<string, AlignedSubmissionEntry>
> {
  const store = await readStoreData();
  return new Map(store.entries.map((e) => [e.rowKey, e]));
}

export async function markAlignedSubmissionOpened(
  rowKey: string,
): Promise<AlignedSubmissionEntry> {
  const key = rowKey.trim();
  const store = await readStoreData();
  const idx = store.entries.findIndex((e) => e.rowKey === key);
  if (idx >= 0) {
    return normalizeEntry(store.entries[idx]!);
  }
  const entry: AlignedSubmissionEntry = {
    rowKey: key,
    openedAt: new Date().toISOString(),
    status: "reviewed",
  };
  store.entries.push(entry);
  await writeStoreData(store);
  return entry;
}

export async function setAlignedSubmissionStatus(
  rowKey: string,
  status: AlignedPortalSubmissionStatus,
): Promise<AlignedSubmissionEntry> {
  const key = rowKey.trim();
  const store = await readStoreData();
  const idx = store.entries.findIndex((e) => e.rowKey === key);
  const openedAt = new Date().toISOString();
  if (idx >= 0) {
    store.entries[idx] = {
      ...store.entries[idx]!,
      status,
    };
    await writeStoreData(store);
    return normalizeEntry(store.entries[idx]!);
  }
  const entry: AlignedSubmissionEntry = {
    rowKey: key,
    openedAt,
    status,
  };
  store.entries.push(entry);
  await writeStoreData(store);
  return entry;
}
