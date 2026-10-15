import type {
  AlignedPortalSubmissionStatus,
  AlignedSubmissionEntry,
} from "@/lib/aligned-instructor-submission-types";
import { createManifestStore } from "@/lib/manifest-store";

export type {
  AlignedPortalSubmissionStatus,
  AlignedSubmissionEntry,
} from "@/lib/aligned-instructor-submission-types";

export {
  ALIGNED_PORTAL_SUBMISSION_LABELS,
} from "@/lib/aligned-instructor-submission-types";

const CLOUD_MANIFEST_KEY = "aligned-instructor-submissions/__manifest.json";

type StoreFile = {
  entries: AlignedSubmissionEntry[];
};

function normalizeEntry(raw: AlignedSubmissionEntry): AlignedSubmissionEntry {
  return { ...raw };
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "entries" in data &&
    Array.isArray((data as StoreFile).entries)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "aligned-instructor-submissions.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ entries: [] }),
  normalize: (data) => ({
    entries: data.entries.map((e) => normalizeEntry(e)),
  }),
  isValid: isStoreFile,
});

export async function getAlignedSubmissionMap(): Promise<
  Map<string, AlignedSubmissionEntry>
> {
  const store = await manifest.read();
  return new Map(store.entries.map((e) => [e.rowKey, e]));
}

export async function markAlignedSubmissionOpened(
  rowKey: string,
): Promise<AlignedSubmissionEntry> {
  const key = rowKey.trim();
  const store = await manifest.read();
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
  await manifest.write(store);
  return entry;
}

export async function setAlignedSubmissionStatus(
  rowKey: string,
  status: AlignedPortalSubmissionStatus,
): Promise<AlignedSubmissionEntry> {
  const key = rowKey.trim();
  const store = await manifest.read();
  const idx = store.entries.findIndex((e) => e.rowKey === key);
  const openedAt = new Date().toISOString();
  if (idx >= 0) {
    store.entries[idx] = {
      ...store.entries[idx]!,
      status,
    };
    await manifest.write(store);
    return normalizeEntry(store.entries[idx]!);
  }
  const entry: AlignedSubmissionEntry = {
    rowKey: key,
    openedAt,
    status,
  };
  store.entries.push(entry);
  await manifest.write(store);
  return entry;
}
