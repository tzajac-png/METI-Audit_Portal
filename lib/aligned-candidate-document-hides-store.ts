import { createManifestStore } from "@/lib/manifest-store";

const CLOUD_MANIFEST_KEY = "aligned-candidate-document-hides/__manifest.json";

type StoreFile = {
  /** Row keys from {@link credentialsRowKey} — hidden in portal only. */
  hiddenRowKeys: string[];
};

function normalizeStore(raw: StoreFile): StoreFile {
  const keys = [...new Set((raw.hiddenRowKeys ?? []).map((k) => k.trim()))].filter(
    Boolean,
  );
  return { hiddenRowKeys: keys };
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "hiddenRowKeys" in data &&
    Array.isArray((data as StoreFile).hiddenRowKeys)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "aligned-candidate-document-hides.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ hiddenRowKeys: [] }),
  normalize: normalizeStore,
  isValid: isStoreFile,
});

export async function getHiddenCandidateDocumentRowKeys(): Promise<Set<string>> {
  const store = await manifest.read();
  return new Set(store.hiddenRowKeys);
}

export async function hideCandidateDocumentRowKey(rowKey: string): Promise<void> {
  const key = rowKey.trim();
  if (!key) return;
  const store = await manifest.read();
  if (!store.hiddenRowKeys.includes(key)) {
    store.hiddenRowKeys.push(key);
    await manifest.write(store);
  }
}
