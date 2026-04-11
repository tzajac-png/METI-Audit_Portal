import fs from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "aligned-candidate-document-hides.json");
const BLOB_MANIFEST_PATHNAME =
  "aligned-candidate-document-hides/__manifest.json";

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

async function readStoreData(): Promise<StoreFile> {
  if (isInstructorBlobStorageConfigured()) {
    try {
      const result = await get(BLOB_MANIFEST_PATHNAME, {
        access: "private",
        ...blobReadWriteOptions(),
      });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return { hiddenRowKeys: [] };
      }
      const raw = Buffer.from(
        await new Response(result.stream).arrayBuffer(),
      ).toString("utf8");
      const parsed = JSON.parse(raw) as StoreFile;
      if (parsed?.hiddenRowKeys && Array.isArray(parsed.hiddenRowKeys)) {
        return normalizeStore(parsed);
      }
    } catch {
      /* missing */
    }
    return { hiddenRowKeys: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.hiddenRowKeys && Array.isArray(parsed.hiddenRowKeys)) {
      return normalizeStore(parsed);
    }
  } catch {
    /* empty */
  }
  return { hiddenRowKeys: [] };
}

async function writeStoreData(data: StoreFile): Promise<void> {
  const normalized = normalizeStore(data);

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

export async function getHiddenCandidateDocumentRowKeys(): Promise<Set<string>> {
  const store = await readStoreData();
  return new Set(store.hiddenRowKeys);
}

export async function hideCandidateDocumentRowKey(rowKey: string): Promise<void> {
  const key = rowKey.trim();
  if (!key) return;
  const store = await readStoreData();
  if (!store.hiddenRowKeys.includes(key)) {
    store.hiddenRowKeys.push(key);
    await writeStoreData(store);
  }
}
