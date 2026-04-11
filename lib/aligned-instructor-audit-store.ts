import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { get, put } from "@vercel/blob";
import {
  normalizeCompliance,
  type AuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import {
  blobReadWriteOptions,
  isInstructorBlobStorageConfigured,
} from "@/lib/instructor-vercel-blob";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "aligned-instructor-audits.json");
const BLOB_MANIFEST_PATHNAME = "aligned-instructor-audits/__manifest.json";

export type AlignedInstructorAuditRecord = {
  id: string;
  rowKey: string;
  displayLabel: string;
  rowSnapshot: Record<string, string>;
  auditorName: AuditorName;
  auditedAt: string;
  updatedAt?: string;
  compliance: ComplianceChecklist;
  notes: string;
};

type StoreFile = {
  records: AlignedInstructorAuditRecord[];
};

function normalizeRecord(
  raw: AlignedInstructorAuditRecord,
): AlignedInstructorAuditRecord {
  return {
    ...raw,
    rowSnapshot: { ...raw.rowSnapshot },
    compliance: normalizeCompliance(raw.compliance),
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
          records: parsed.records.map((r) =>
            normalizeRecord(r as AlignedInstructorAuditRecord),
          ),
        };
      }
    } catch {
      /* missing manifest */
    }
    return { records: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.records && Array.isArray(parsed.records)) {
      return {
        records: parsed.records.map((r) =>
          normalizeRecord(r as AlignedInstructorAuditRecord),
        ),
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

export async function listAlignedInstructorAuditRecords(): Promise<
  AlignedInstructorAuditRecord[]
> {
  const store = await readStoreData();
  return [...store.records].sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  );
}

export async function getAlignedInstructorAuditById(
  id: string,
): Promise<AlignedInstructorAuditRecord | null> {
  const store = await readStoreData();
  const r = store.records.find((rec) => rec.id === id);
  return r ? normalizeRecord(r) : null;
}

export async function getLatestAlignedAuditForRowKey(
  rowKey: string,
): Promise<AlignedInstructorAuditRecord | null> {
  const key = rowKey.trim();
  const store = await readStoreData();
  const matches = store.records.filter((r) => r.rowKey === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0]!;
}

export async function deleteAlignedInstructorAudit(id: string): Promise<boolean> {
  const store = await readStoreData();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  store.records.splice(idx, 1);
  await writeStoreData(store);
  return true;
}

export type CreateAlignedInstructorAuditInput = {
  rowKey: string;
  displayLabel: string;
  rowSnapshot: Record<string, string>;
  auditorName: AuditorName;
  compliance: ComplianceChecklist;
  notes: string;
};

export async function createAlignedInstructorAuditRecord(
  input: CreateAlignedInstructorAuditInput,
): Promise<AlignedInstructorAuditRecord> {
  const rec: AlignedInstructorAuditRecord = {
    id: randomUUID(),
    rowKey: input.rowKey.trim(),
    displayLabel: input.displayLabel.trim(),
    rowSnapshot: { ...input.rowSnapshot },
    auditorName: input.auditorName,
    auditedAt: new Date().toISOString(),
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
  };
  const store = await readStoreData();
  store.records.push(rec);
  await writeStoreData(store);
  return rec;
}

export async function updateAlignedInstructorAuditRecord(
  id: string,
  input: CreateAlignedInstructorAuditInput,
): Promise<AlignedInstructorAuditRecord | null> {
  const store = await readStoreData();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const prev = store.records[idx];
  const rec: AlignedInstructorAuditRecord = {
    ...prev,
    rowKey: input.rowKey.trim(),
    displayLabel: input.displayLabel.trim(),
    rowSnapshot: { ...input.rowSnapshot },
    auditorName: input.auditorName,
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
    updatedAt: new Date().toISOString(),
  };
  store.records[idx] = rec;
  await writeStoreData(store);
  return rec;
}
