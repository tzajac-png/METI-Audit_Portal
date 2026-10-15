import fs from "fs";
import path from "path";
import {
  isRemoteCloudStorageConfigured,
  readCloudJson,
  writeCloudJson,
} from "@/lib/cloud-storage";

const DATA_DIR = path.join(process.cwd(), "data");

type ManifestStoreOptions<T> = {
  localFileName: string;
  cloudKey: string;
  defaultValue: () => T;
  normalize: (data: T) => T;
  isValid: (data: unknown) => data is T;
};

export function createManifestStore<T>(options: ManifestStoreOptions<T>) {
  const storeFile = path.join(DATA_DIR, options.localFileName);

  async function read(): Promise<T> {
    if (isRemoteCloudStorageConfigured()) {
      const parsed = await readCloudJson<unknown>(options.cloudKey);
      if (parsed && options.isValid(parsed)) {
        return options.normalize(parsed);
      }
      return options.defaultValue();
    }

    try {
      const raw = fs.readFileSync(storeFile, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (options.isValid(parsed)) {
        return options.normalize(parsed);
      }
    } catch {
      /* empty */
    }
    return options.defaultValue();
  }

  async function write(data: T): Promise<void> {
    const normalized = options.normalize(data);
    if (isRemoteCloudStorageConfigured()) {
      await writeCloudJson(options.cloudKey, normalized);
      return;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(normalized, null, 2), "utf8");
  }

  return { read, write };
}
