import { randomUUID } from "crypto";
import { deleteCloudObject } from "@/lib/cloud-storage";
import { createManifestStore } from "@/lib/manifest-store";
import type {
  EmsCeClass,
  EmsCeClassStatus,
  EmsCeFileMeta,
  EmsCeMaterial,
  EmsCeStateStatus,
  EmsCeStateSubmission,
} from "@/lib/ems-ce-types";
import {
  EMS_CE_CLASS_STATUSES,
  EMS_CE_STATE_STATUSES,
} from "@/lib/ems-ce-types";

export type {
  EmsCeClass,
  EmsCeClassStatus,
  EmsCeFileMeta,
  EmsCeMaterial,
  EmsCeStateStatus,
  EmsCeStateSubmission,
} from "@/lib/ems-ce-types";

export {
  EMS_CE_CLASS_STATUSES,
  EMS_CE_CLASS_STATUS_LABELS,
  EMS_CE_STATE_STATUSES,
  EMS_CE_STATE_STATUS_LABELS,
} from "@/lib/ems-ce-types";

type StoreFile = {
  submissions: EmsCeStateSubmission[];
  materials: EmsCeMaterial[];
  classes: EmsCeClass[];
};

function isStatus(v: string): v is EmsCeStateStatus {
  return (EMS_CE_STATE_STATUSES as readonly string[]).includes(v);
}

function isClassStatus(v: string): v is EmsCeClassStatus {
  return (EMS_CE_CLASS_STATUSES as readonly string[]).includes(v);
}

function normalizeFile(raw: EmsCeFileMeta | null | undefined): EmsCeFileMeta | null {
  if (!raw) return null;
  return {
    id: raw.id || randomUUID(),
    originalName: raw.originalName || "file",
    mimeType: raw.mimeType || "application/octet-stream",
    size: Number(raw.size) || 0,
    uploadedAt: raw.uploadedAt || new Date().toISOString(),
    storageKey: raw.storageKey,
    storedName: raw.storedName,
    label: raw.label,
  };
}

function normalizeSubmission(raw: EmsCeStateSubmission): EmsCeStateSubmission {
  const status = isStatus(raw.status) ? raw.status : "draft";
  return {
    id: raw.id,
    courseTitle: (raw.courseTitle ?? "").trim() || "—",
    courseDate: (raw.courseDate ?? "").trim(),
    hours: (raw.hours ?? "").trim(),
    instructor: (raw.instructor ?? "").trim(),
    submittedToStateAt: (raw.submittedToStateAt ?? "").trim(),
    status,
    confirmationNumber: (raw.confirmationNumber ?? "").trim(),
    notes: (raw.notes ?? "").trim(),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeMaterial(raw: EmsCeMaterial): EmsCeMaterial {
  return {
    id: raw.id,
    title: (raw.title ?? "").trim() || "Untitled material",
    category: (raw.category ?? "").trim() || "General",
    notes: (raw.notes ?? "").trim(),
    file: normalizeFile(raw.file),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeClass(raw: EmsCeClass): EmsCeClass {
  const status = isClassStatus(raw.status) ? raw.status : "planning";
  return {
    id: raw.id,
    title: (raw.title ?? "").trim() || "Untitled class",
    courseDate: (raw.courseDate ?? "").trim(),
    location: (raw.location ?? "").trim(),
    instructor: (raw.instructor ?? "").trim(),
    hours: (raw.hours ?? "").trim(),
    status,
    notes: (raw.notes ?? "").trim(),
    paperwork: (raw.paperwork ?? [])
      .map((f) => normalizeFile(f))
      .filter((f): f is EmsCeFileMeta => !!f),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as StoreFile).submissions) &&
    Array.isArray((data as StoreFile).materials) &&
    Array.isArray((data as StoreFile).classes)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "ems-ce.json",
  cloudKey: "ems-ce/__manifest.json",
  defaultValue: () => ({ submissions: [], materials: [], classes: [] }),
  normalize: (data) => ({
    submissions: data.submissions.map(normalizeSubmission),
    materials: data.materials.map(normalizeMaterial),
    classes: data.classes.map(normalizeClass),
  }),
  isValid: isStoreFile,
});

async function readStore(): Promise<StoreFile> {
  return manifest.read();
}

async function writeStore(data: StoreFile): Promise<void> {
  await manifest.write(data);
}

async function removeFileStorage(file: EmsCeFileMeta | null | undefined): Promise<void> {
  if (file?.storageKey) {
    await deleteCloudObject(file.storageKey);
  }
}

export async function listEmsCeStateSubmissions(): Promise<EmsCeStateSubmission[]> {
  const store = await readStore();
  return [...store.submissions].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export type UpsertEmsCeStateSubmissionInput = {
  id?: string;
  courseTitle: string;
  courseDate: string;
  hours: string;
  instructor: string;
  submittedToStateAt: string;
  status: EmsCeStateStatus;
  confirmationNumber: string;
  notes: string;
};

export async function upsertEmsCeStateSubmission(
  input: UpsertEmsCeStateSubmissionInput,
): Promise<EmsCeStateSubmission> {
  const store = await readStore();
  const now = new Date().toISOString();
  const status = isStatus(input.status) ? input.status : "draft";

  if (input.id) {
    const idx = store.submissions.findIndex((s) => s.id === input.id);
    if (idx === -1) throw new Error("Submission not found");
    const next: EmsCeStateSubmission = normalizeSubmission({
      ...store.submissions[idx]!,
      courseTitle: input.courseTitle,
      courseDate: input.courseDate,
      hours: input.hours,
      instructor: input.instructor,
      submittedToStateAt: input.submittedToStateAt,
      status,
      confirmationNumber: input.confirmationNumber,
      notes: input.notes,
      updatedAt: now,
    });
    store.submissions[idx] = next;
    await writeStore(store);
    return next;
  }

  const rec: EmsCeStateSubmission = normalizeSubmission({
    id: randomUUID(),
    courseTitle: input.courseTitle,
    courseDate: input.courseDate,
    hours: input.hours,
    instructor: input.instructor,
    submittedToStateAt: input.submittedToStateAt,
    status,
    confirmationNumber: input.confirmationNumber,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  });
  store.submissions.push(rec);
  await writeStore(store);
  return rec;
}

export async function deleteEmsCeStateSubmission(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.submissions.length;
  store.submissions = store.submissions.filter((s) => s.id !== id);
  if (store.submissions.length === before) return false;
  await writeStore(store);
  return true;
}

export async function listEmsCeMaterials(): Promise<EmsCeMaterial[]> {
  const store = await readStore();
  return [...store.materials].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export type UpsertEmsCeMaterialInput = {
  id?: string;
  title: string;
  category: string;
  notes: string;
  file?: EmsCeFileMeta | null;
};

export async function upsertEmsCeMaterial(
  input: UpsertEmsCeMaterialInput,
): Promise<EmsCeMaterial> {
  const store = await readStore();
  const now = new Date().toISOString();

  if (input.id) {
    const idx = store.materials.findIndex((m) => m.id === input.id);
    if (idx === -1) throw new Error("Material not found");
    const prev = store.materials[idx]!;
    const nextFile =
      input.file === undefined ? prev.file : normalizeFile(input.file);
    if (
      input.file &&
      prev.file?.storageKey &&
      prev.file.storageKey !== input.file.storageKey
    ) {
      await removeFileStorage(prev.file);
    }
    const next: EmsCeMaterial = normalizeMaterial({
      ...prev,
      title: input.title,
      category: input.category,
      notes: input.notes,
      file: nextFile,
      updatedAt: now,
    });
    store.materials[idx] = next;
    await writeStore(store);
    return next;
  }

  const rec: EmsCeMaterial = normalizeMaterial({
    id: randomUUID(),
    title: input.title,
    category: input.category,
    notes: input.notes,
    file: normalizeFile(input.file ?? null),
    createdAt: now,
    updatedAt: now,
  });
  store.materials.push(rec);
  await writeStore(store);
  return rec;
}

export async function deleteEmsCeMaterial(id: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.materials.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  const [removed] = store.materials.splice(idx, 1);
  await writeStore(store);
  await removeFileStorage(removed?.file);
  return true;
}

export async function getEmsCeMaterialById(
  id: string,
): Promise<EmsCeMaterial | null> {
  const store = await readStore();
  return store.materials.find((m) => m.id === id) ?? null;
}

export async function listEmsCeClasses(): Promise<EmsCeClass[]> {
  const store = await readStore();
  return [...store.classes].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getEmsCeClassById(id: string): Promise<EmsCeClass | null> {
  const store = await readStore();
  return store.classes.find((c) => c.id === id) ?? null;
}

export type UpsertEmsCeClassInput = {
  id?: string;
  title: string;
  courseDate: string;
  location: string;
  instructor: string;
  hours: string;
  status: EmsCeClassStatus;
  notes: string;
};

export async function upsertEmsCeClass(
  input: UpsertEmsCeClassInput,
): Promise<EmsCeClass> {
  const store = await readStore();
  const now = new Date().toISOString();
  const status = isClassStatus(input.status) ? input.status : "planning";

  if (input.id) {
    const idx = store.classes.findIndex((c) => c.id === input.id);
    if (idx === -1) throw new Error("Class not found");
    const prev = store.classes[idx]!;
    const next: EmsCeClass = normalizeClass({
      ...prev,
      title: input.title,
      courseDate: input.courseDate,
      location: input.location,
      instructor: input.instructor,
      hours: input.hours,
      status,
      notes: input.notes,
      updatedAt: now,
    });
    store.classes[idx] = next;
    await writeStore(store);
    return next;
  }

  const rec: EmsCeClass = normalizeClass({
    id: randomUUID(),
    title: input.title,
    courseDate: input.courseDate,
    location: input.location,
    instructor: input.instructor,
    hours: input.hours,
    status,
    notes: input.notes,
    paperwork: [],
    createdAt: now,
    updatedAt: now,
  });
  store.classes.push(rec);
  await writeStore(store);
  return rec;
}

export async function addEmsCeClassPaperwork(
  classId: string,
  file: Omit<EmsCeFileMeta, "id" | "uploadedAt"> & {
    id?: string;
    uploadedAt?: string;
  },
): Promise<EmsCeClass> {
  const store = await readStore();
  const idx = store.classes.findIndex((c) => c.id === classId);
  if (idx === -1) throw new Error("Class not found");
  const cls = store.classes[idx]!;
  const entry = normalizeFile({
    id: file.id || randomUUID(),
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: file.uploadedAt || new Date().toISOString(),
    storageKey: file.storageKey,
    storedName: file.storedName,
    label: file.label,
  });
  if (!entry) throw new Error("Invalid file");
  cls.paperwork = [...cls.paperwork, entry];
  cls.updatedAt = new Date().toISOString();
  store.classes[idx] = cls;
  await writeStore(store);
  return normalizeClass(cls);
}

export async function removeEmsCeClassPaperwork(
  classId: string,
  fileId: string,
): Promise<EmsCeClass | null> {
  const store = await readStore();
  const idx = store.classes.findIndex((c) => c.id === classId);
  if (idx === -1) return null;
  const cls = store.classes[idx]!;
  const file = cls.paperwork.find((f) => f.id === fileId) ?? null;
  cls.paperwork = cls.paperwork.filter((f) => f.id !== fileId);
  cls.updatedAt = new Date().toISOString();
  store.classes[idx] = cls;
  await writeStore(store);
  await removeFileStorage(file);
  return normalizeClass(cls);
}

export async function deleteEmsCeClass(id: string): Promise<boolean> {
  const store = await readStore();
  const idx = store.classes.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  const [removed] = store.classes.splice(idx, 1);
  await writeStore(store);
  for (const f of removed?.paperwork ?? []) {
    await removeFileStorage(f);
  }
  return true;
}

export function buildEmsCeStoredFileName(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${Date.now()}-${safe || "file"}`;
}
