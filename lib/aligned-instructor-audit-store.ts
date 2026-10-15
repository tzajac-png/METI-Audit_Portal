import { randomUUID } from "crypto";
import {
  normalizeCompliance,
  type AuditorName,
  type ComplianceChecklist,
} from "@/lib/audit-constants";
import { createManifestStore } from "@/lib/manifest-store";

const CLOUD_MANIFEST_KEY = "aligned-instructor-audits/__manifest.json";

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

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "records" in data &&
    Array.isArray((data as StoreFile).records)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "aligned-instructor-audits.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ records: [] }),
  normalize: (data) => ({
    records: data.records.map((r) => normalizeRecord(r)),
  }),
  isValid: isStoreFile,
});

export async function listAlignedInstructorAuditRecords(): Promise<
  AlignedInstructorAuditRecord[]
> {
  const store = await manifest.read();
  return [...store.records].sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  );
}

export async function getAlignedInstructorAuditById(
  id: string,
): Promise<AlignedInstructorAuditRecord | null> {
  const store = await manifest.read();
  const r = store.records.find((rec) => rec.id === id);
  return r ? normalizeRecord(r) : null;
}

export async function getLatestAlignedAuditForRowKey(
  rowKey: string,
): Promise<AlignedInstructorAuditRecord | null> {
  const key = rowKey.trim();
  const store = await manifest.read();
  const matches = store.records.filter((r) => r.rowKey === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0];
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
    displayLabel: input.displayLabel,
    rowSnapshot: { ...input.rowSnapshot },
    auditorName: input.auditorName,
    auditedAt: new Date().toISOString(),
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
  };
  const store = await manifest.read();
  store.records.push(rec);
  await manifest.write(store);
  return rec;
}

export async function updateAlignedInstructorAuditRecord(
  id: string,
  input: CreateAlignedInstructorAuditInput,
): Promise<AlignedInstructorAuditRecord | null> {
  const store = await manifest.read();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const prev = store.records[idx];
  const rec: AlignedInstructorAuditRecord = {
    ...prev,
    rowKey: input.rowKey.trim(),
    displayLabel: input.displayLabel,
    rowSnapshot: { ...input.rowSnapshot },
    auditorName: input.auditorName,
    compliance: { ...input.compliance },
    notes: input.notes.trim(),
    updatedAt: new Date().toISOString(),
  };
  store.records[idx] = rec;
  await manifest.write(store);
  return rec;
}

export async function deleteAlignedInstructorAudit(
  id: string,
): Promise<boolean> {
  const store = await manifest.read();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  store.records.splice(idx, 1);
  await manifest.write(store);
  return true;
}
