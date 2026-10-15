import { createManifestStore } from "@/lib/manifest-store";

const CLOUD_MANIFEST_KEY = "course-audit-requests/__manifest.json";

export type CourseAuditRequest = {
  courseCode: string;
  programTitle: string;
  courseDateLabel: string;
  courseLocation: string;
  leadInstructor: string;
  requestedAt: string;
};

type StoreFile = {
  requests: CourseAuditRequest[];
};

function normalizeRequest(raw: CourseAuditRequest): CourseAuditRequest {
  return {
    courseCode: raw.courseCode.trim(),
    programTitle: raw.programTitle.trim() || "—",
    courseDateLabel: raw.courseDateLabel.trim() || "—",
    courseLocation: raw.courseLocation.trim() || "—",
    leadInstructor: raw.leadInstructor.trim() || "—",
    requestedAt: raw.requestedAt,
  };
}

function isStoreFile(data: unknown): data is StoreFile {
  return (
    !!data &&
    typeof data === "object" &&
    "requests" in data &&
    Array.isArray((data as StoreFile).requests)
  );
}

const manifest = createManifestStore<StoreFile>({
  localFileName: "course-audit-requests.json",
  cloudKey: CLOUD_MANIFEST_KEY,
  defaultValue: () => ({ requests: [] }),
  normalize: (data) => ({
    requests: data.requests.map((r) => normalizeRequest(r)),
  }),
  isValid: isStoreFile,
});

export async function listCourseAuditRequests(): Promise<CourseAuditRequest[]> {
  const store = await manifest.read();
  return [...store.requests].sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export async function getCourseAuditRequest(
  courseCode: string,
): Promise<CourseAuditRequest | null> {
  const key = courseCode.trim();
  const store = await manifest.read();
  return store.requests.find((r) => r.courseCode === key) ?? null;
}

export type CreateCourseAuditRequestInput = {
  courseCode: string;
  programTitle: string;
  courseDateLabel: string;
  courseLocation: string;
  leadInstructor: string;
};

export async function upsertCourseAuditRequest(
  input: CreateCourseAuditRequestInput,
): Promise<CourseAuditRequest> {
  const key = input.courseCode.trim();
  const store = await manifest.read();
  const idx = store.requests.findIndex((r) => r.courseCode === key);
  const next: CourseAuditRequest = normalizeRequest({
    courseCode: key,
    programTitle: input.programTitle,
    courseDateLabel: input.courseDateLabel,
    courseLocation: input.courseLocation,
    leadInstructor: input.leadInstructor,
    requestedAt: new Date().toISOString(),
  });
  if (idx >= 0) {
    store.requests[idx] = next;
  } else {
    store.requests.push(next);
  }
  await manifest.write(store);
  return next;
}

export async function removeCourseAuditRequest(
  courseCode: string,
): Promise<boolean> {
  const key = courseCode.trim();
  const store = await manifest.read();
  const before = store.requests.length;
  store.requests = store.requests.filter((r) => r.courseCode !== key);
  if (store.requests.length === before) return false;
  await manifest.write(store);
  return true;
}
