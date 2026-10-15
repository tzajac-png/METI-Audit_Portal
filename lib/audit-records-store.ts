import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AuditorName, ComplianceChecklist } from "@/lib/audit-constants";
import { emptyCompliance, normalizeCompliance } from "@/lib/audit-constants";
import { deleteCloudObject } from "@/lib/cloud-storage";
import { createManifestStore } from "@/lib/manifest-store";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "audit-uploads");
const CLOUD_MANIFEST_KEY = "audit-records/__manifest.json";

export type EcardFileMeta = {
  originalName: string;
  mimeType: string;
  size: number;
  /** Local filename under data/audit-uploads/ when not using cloud storage. */
  storedName?: string;
  /** Backblaze B2 object key (production). */
  storageKey?: string;
  /** @deprecated Legacy Vercel Blob URL — no longer written. */
  blobUrl?: string;
};

export type AuditRecord = {
  id: string;
  courseCode: string;
  courseDateLabel: string;
  courseLocation: string;
  leadInstructor: string;
  auditorName: AuditorName;
  /** First submission time */
  auditedAt: string;
  /** Set when the record was last updated via edit */
  updatedAt?: string;
  compliance: ComplianceChecklist;
  notes: string;
  ecardFile: EcardFileMeta | null;
};

type StoreFile = {
  records: AuditRecord[];
};

function normalizeRecord(raw: AuditRecord): AuditRecord {
  return {
    ...raw,
    compliance: normalizeCompliance(raw.compliance),
    ecardFile: raw.ecardFile
      ? {
          originalName: raw.ecardFile.originalName,
          mimeType: raw.ecardFile.mimeType,
          size: raw.ecardFile.size,
          storedName: raw.ecardFile.storedName,
          storageKey: raw.ecardFile.storageKey,
          blobUrl: raw.ecardFile.blobUrl,
        }
      : null,
  };
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "records" in data &&
    Array.isArray((data as StoreFile).records)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "audit-records.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ records: [] }),
  normalize: (data) => ({
    records: data.records.map((r) => normalizeRecord(r)),
  }),
  isValid: isStoreFile,
});

async function readStoreData(): Promise<StoreFile> {
  return manifest.read();
}

async function writeStoreData(data: StoreFile): Promise<void> {
  await manifest.write(data);
}

export async function listAuditRecords(): Promise<AuditRecord[]> {
  const store = await readStoreData();
  return [...store.records].sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  );
}

export async function getAuditRecordById(id: string): Promise<AuditRecord | null> {
  const store = await readStoreData();
  const r = store.records.find((rec) => rec.id === id);
  return r ? normalizeRecord(r) : null;
}

/** Latest audit for a course (by auditedAt), if any */
export async function getLatestAuditForCourse(
  courseCode: string,
): Promise<AuditRecord | null> {
  const key = courseCode.trim();
  const store = await readStoreData();
  const matches = store.records.filter((r) => r.courseCode.trim() === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0];
}

/**
 * One manifest read for many course codes — avoids N parallel cloud fetches
 * on course list pages (was causing "Connection closed" on Vercel).
 */
export async function getLatestAuditForCourses(
  courseCodes: string[],
): Promise<Map<string, AuditRecord | null>> {
  const store = await readStoreData();
  const want = new Set(
    courseCodes.map((c) => c.trim()).filter((c) => c.length > 0),
  );
  const best = new Map<string, AuditRecord>();
  for (const r of store.records) {
    const key = r.courseCode.trim();
    if (!want.has(key)) continue;
    const prev = best.get(key);
    if (
      !prev ||
      new Date(r.auditedAt).getTime() > new Date(prev.auditedAt).getTime()
    ) {
      best.set(key, normalizeRecord(r));
    }
  }
  const result = new Map<string, AuditRecord | null>();
  for (const code of want) {
    result.set(code, best.get(code) ?? null);
  }
  return result;
}

async function removeEcardStorage(f: EcardFileMeta | null | undefined): Promise<void> {
  if (!f) return;
  if (f.storageKey) {
    await deleteCloudObject(f.storageKey);
    return;
  }
  if (f.storedName) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, f.storedName));
    } catch {
      /* ignore */
    }
  }
}

export async function deleteAuditRecord(id: string): Promise<boolean> {
  const store = await readStoreData();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const [removed] = store.records.splice(idx, 1);
  await writeStoreData(store);
  await removeEcardStorage(removed.ecardFile);
  return true;
}

export type CreateAuditInput = {
  courseCode: string;
  courseDateLabel: string;
  courseLocation: string;
  leadInstructor: string;
  auditorName: AuditorName;
  compliance: ComplianceChecklist;
  notes: string;
  ecardFile: EcardFileMeta | null;
};

export async function createAuditRecord(
  input: CreateAuditInput,
): Promise<AuditRecord> {
  const rec: AuditRecord = {
    id: randomUUID(),
    courseCode: input.courseCode.trim(),
    courseDateLabel: input.courseDateLabel,
    courseLocation: input.courseLocation,
    leadInstructor: input.leadInstructor,
    auditorName: input.auditorName,
    auditedAt: new Date().toISOString(),
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
    ecardFile: input.ecardFile,
  };
  const store = await readStoreData();
  store.records.push(rec);
  await writeStoreData(store);
  return rec;
}

export async function updateAuditRecord(
  id: string,
  input: CreateAuditInput,
): Promise<AuditRecord | null> {
  const store = await readStoreData();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const prev = store.records[idx];
  const rec: AuditRecord = {
    ...prev,
    courseCode: input.courseCode.trim(),
    courseDateLabel: input.courseDateLabel,
    courseLocation: input.courseLocation,
    leadInstructor: input.leadInstructor,
    auditorName: input.auditorName,
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
    ecardFile: input.ecardFile,
    updatedAt: new Date().toISOString(),
  };
  store.records[idx] = rec;
  await writeStoreData(store);
  return rec;
}

/** Quick flag for course page — minimal record with defaults */
export async function createQuickAuditFlag(
  courseCode: string,
  meta: {
    courseDateLabel: string;
    courseLocation: string;
    leadInstructor: string;
    auditorName: AuditorName;
  },
): Promise<AuditRecord> {
  return createAuditRecord({
    courseCode,
    courseDateLabel: meta.courseDateLabel,
    courseLocation: meta.courseLocation,
    leadInstructor: meta.leadInstructor,
    auditorName: meta.auditorName,
    compliance: emptyCompliance(),
    notes: "",
    ecardFile: null,
  });
}

export async function removeAllAuditsForCourse(courseCode: string): Promise<number> {
  const key = courseCode.trim();
  const store = await readStoreData();
  const keep: AuditRecord[] = [];
  let removed = 0;
  for (const r of store.records) {
    if (r.courseCode === key) {
      removed++;
      await removeEcardStorage(r.ecardFile);
    } else {
      keep.push(r);
    }
  }
  store.records = keep;
  await writeStoreData(store);
  return removed;
}

export function getUploadsDir(): string {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export { sanitizeStoredFileName } from "@/lib/sanitize-filename";
