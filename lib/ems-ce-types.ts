export const EMS_CE_STATE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "denied",
  "resubmitted",
] as const;

export type EmsCeStateStatus = (typeof EMS_CE_STATE_STATUSES)[number];

export const EMS_CE_STATE_STATUS_LABELS: Record<EmsCeStateStatus, string> = {
  draft: "Draft",
  submitted: "Submitted to state",
  under_review: "Under review",
  approved: "Approved",
  denied: "Denied",
  resubmitted: "Resubmitted",
};

export type EmsCeFileMeta = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  storageKey?: string;
  storedName?: string;
  label?: string;
};

export type EmsCeStateSubmission = {
  id: string;
  courseTitle: string;
  courseDate: string;
  hours: string;
  instructor: string;
  submittedToStateAt: string;
  status: EmsCeStateStatus;
  confirmationNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type EmsCeMaterial = {
  id: string;
  title: string;
  category: string;
  notes: string;
  file: EmsCeFileMeta | null;
  createdAt: string;
  updatedAt: string;
};

export const EMS_CE_CLASS_STATUSES = [
  "planning",
  "scheduled",
  "completed",
  "cancelled",
] as const;

export type EmsCeClassStatus = (typeof EMS_CE_CLASS_STATUSES)[number];

export const EMS_CE_CLASS_STATUS_LABELS: Record<EmsCeClassStatus, string> = {
  planning: "Planning",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type EmsCeClass = {
  id: string;
  title: string;
  courseDate: string;
  location: string;
  instructor: string;
  hours: string;
  status: EmsCeClassStatus;
  notes: string;
  paperwork: EmsCeFileMeta[];
  createdAt: string;
  updatedAt: string;
};
