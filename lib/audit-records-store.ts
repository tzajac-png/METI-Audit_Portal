import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AuditorName, ComplianceChecklist } from "@/lib/audit-constants";
import { emptyCompliance } from "@/lib/audit-constants";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "audit-records.json");
const UPLOADS_DIR = path.join(DATA_DIR, "audit-uploads");

export type EcardFileMeta = {
  originalName: string;
  mimeType: string;
  size: number;
  /** Present when the file is stored on this server’s disk. */
  storedName?: string;
};

export type AuditRecord = {
  id: string;
  courseCode: string;
  courseDateLabel: string;
  courseLocation: string;
  leadInstructor: string;
  auditorName: AuditorName;
  auditedAt: string;
  compliance: ComplianceChecklist;
  notes: string;
  ecardFile: EcardFileMeta | null;
};

type StoreFile = {
  records: AuditRecord[];
};

function readStore(): StoreFile {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.records && Array.isArray(parsed.records)) return parsed;
  } catch {
    /* empty */
  }
  return { records: [] };
}

function writeStore(data: StoreFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function listAuditRecords(): AuditRecord[] {
  return [...readStore().records].sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  );
}

export function getAuditRecordById(id: string): AuditRecord | null {
  return readStore().records.find((r) => r.id === id) ?? null;
}

/** Latest audit for a course (by auditedAt), if any */
export function getLatestAuditForCourse(courseCode: string): AuditRecord | null {
  const key = courseCode.trim();
  const matches = readStore().records.filter((r) => r.courseCode === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0];
}

export function deleteAuditRecord(id: string): boolean {
  const store = readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const [removed] = store.records.splice(idx, 1);
  writeStore(store);
  removeEcardStorage(removed.ecardFile);
  return true;
}

function removeEcardStorage(f: EcardFileMeta | null | undefined): void {
  if (!f?.storedName) return;
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, f.storedName));
  } catch {
    /* ignore */
  }
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

export function createAuditRecord(input: CreateAuditInput): AuditRecord {
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
  const store = readStore();
  store.records.push(rec);
  writeStore(store);
  return rec;
}

/** Quick flag for course page — minimal record with defaults */
export function createQuickAuditFlag(
  courseCode: string,
  meta: {
    courseDateLabel: string;
    courseLocation: string;
    leadInstructor: string;
    auditorName: AuditorName;
  },
): AuditRecord {
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

export function removeAllAuditsForCourse(courseCode: string): number {
  const key = courseCode.trim();
  const store = readStore();
  const keep: AuditRecord[] = [];
  let removed = 0;
  for (const r of store.records) {
    if (r.courseCode === key) {
      removed++;
      removeEcardStorage(r.ecardFile);
    } else {
      keep.push(r);
    }
  }
  store.records = keep;
  writeStore(store);
  return removed;
}

export function getUploadsDir(): string {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export { sanitizeStoredFileName } from "@/lib/sanitize-filename";
