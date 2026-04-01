import type { InstructorUploadCategory } from "@/lib/instructor-uploads-store";

export type SectionDef = {
  id: string;
  title: string;
  items: { key: InstructorUploadCategory; label: string }[];
};

export const INSTRUCTOR_UPLOAD_SECTIONS: SectionDef[] = [
  {
    id: "bls",
    title: "BLS",
    items: [
      { key: "bls_provider_card", label: "Provider card" },
      { key: "bls_instructor", label: "Instructor" },
    ],
  },
  {
    id: "acls",
    title: "ACLS",
    items: [
      { key: "acls_provider", label: "Provider" },
      { key: "acls_instructor", label: "Instructor" },
    ],
  },
  {
    id: "pals",
    title: "PALS",
    items: [
      { key: "pals_provider", label: "Provider" },
      { key: "pals_instructor", label: "Instructor" },
    ],
  },
];

/** Agreements, monitoring, applications — no credential expiration fields */
export const INSTRUCTOR_UPLOAD_OTHER: {
  key: InstructorUploadCategory;
  label: string;
  isLog: boolean;
}[] = [
  { key: "tri_agreement", label: "Tri Agreement", isLog: false },
  { key: "initial_monitoring", label: "Initial Monitoring", isLog: false },
  {
    key: "initial_application_bls",
    label: "Initial Application — BLS",
    isLog: false,
  },
  {
    key: "initial_application_acls",
    label: "Initial Application — ACLS",
    isLog: false,
  },
  {
    key: "initial_application_pals",
    label: "Initial Application — PALS",
    isLog: false,
  },
  {
    key: "monitoring_paperwork_log",
    label: "Monitoring Paperwork (upload log)",
    isLog: true,
  },
];
