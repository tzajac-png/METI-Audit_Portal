import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { del, get, put } from "@vercel/blob";
import type { AuditorName, ComplianceChecklist } from "@/lib/audit-constants";
import { emptyCompliance } from "@/lib/audit-constants";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "audit-records.json");
const UPLOADS_DIR = path.join(DATA_DIR, "audit-uploads");

/** JSON manifest in Blob when BLOB_READ_WRITE_TOKEN is set (Vercel production). */
const BLOB_MANIFEST_PATHNAME = "audit-records/__manifest.json";

export type EcardFileMeta = {
  originalName: string;
  mimeType: string;
  size: number;
  /** Local filename under data/audit-uploads/ when not using Blob. */
  storedName?: string;
  /** Vercel Blob URL for private eCard / document. */
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
    ecardFile: raw.ecardFile
      ? {
          originalName: raw.ecardFile.originalName,
          mimeType: raw.ecardFile.mimeType,
          size: raw.ecardFile.size,
          storedName: raw.ecardFile.storedName,
          blobUrl: raw.ecardFile.blobUrl,
        }
      : null,
  };
}

async function readStoreData(): Promise<StoreFile> {
  if (isInstructorBlobStorageConfigured()) {
    try {
      const result = await get(BLOB_MANIFEST_PATHNAME, {
        access: "private",
        ...blobReadWriteOptions(),
      });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return { records: [] };
      }
      const raw = Buffer.from(
        await new Response(result.stream).arrayBuffer(),
      ).toString("utf8");
      const parsed = JSON.parse(raw) as StoreFile;
      if (parsed?.records && Array.isArray(parsed.records)) {
        return {
          records: parsed.records.map((r) => normalizeRecord(r as AuditRecord)),
        };
      }
    } catch {
      /* missing manifest or parse error */
    }
    return { records: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.records && Array.isArray(parsed.records)) {
      return {
        records: parsed.records.map((r) => normalizeRecord(r as AuditRecord)),
      };
    }
  } catch {
    /* empty */
  }
  return { records: [] };
}

async function writeStoreData(data: StoreFile): Promise<void> {
  const normalized: StoreFile = {
    records: data.records.map((r) => normalizeRecord(r)),
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
  const matches = store.records.filter((r) => r.courseCode === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0];
}

async function removeEcardStorage(f: EcardFileMeta | null | undefined): Promise<void> {
  if (!f) return;
  if (f.blobUrl && isInstructorBlobStorageConfigured()) {
    try {
      await del(f.blobUrl, blobReadWriteOptions());
    } catch {
      /* ignore */
    }
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
