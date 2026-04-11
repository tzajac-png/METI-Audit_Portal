import type { InstructorUploadCategory } from "@/lib/instructor-uploads-store";

type Rule = {
  category: InstructorUploadCategory;
  test: (normalized: string) => boolean;
};

const RULES: Rule[] = [
  {
    category: "bls_provider_card",
    test: (s) =>
      /bls/.test(s) &&
      /provider/.test(s) &&
      !/instructor/.test(s),
  },
  {
    category: "bls_instructor",
    test: (s) =>
      (/bls/.test(s) && /instructor/.test(s)) || /^bls[-\s]?i\b/.test(s),
  },
  {
    category: "acls_provider",
    test: (s) =>
      /acls/.test(s) &&
      /provider/.test(s) &&
      !/instructor/.test(s),
  },
  {
    category: "acls_instructor",
    test: (s) =>
      (/acls/.test(s) && /instructor/.test(s)) || /^acls[-\s]?i\b/.test(s),
  },
  {
    category: "pals_provider",
    test: (s) =>
      /pals/.test(s) &&
      /provider/.test(s) &&
      !/instructor/.test(s),
  },
  {
    category: "pals_instructor",
    test: (s) =>
      (/pals/.test(s) && /instructor/.test(s)) || /^pals[-\s]?i\b/.test(s),
  },
  {
    category: "tri_agreement",
    test: (s) => /tri\s*agreement|tripartite|tri[-\s]agreement/i.test(s),
  },
  {
    category: "initial_monitoring",
    test: (s) =>
      /initial\s*monitoring|monitoring\s*initial|first\s*monitoring/i.test(s),
  },
  {
    category: "initial_application_bls",
    test: (s) =>
      /initial.*application.*bls|bls.*initial.*application|application.*bls/i.test(
        s,
      ),
  },
  {
    category: "initial_application_acls",
    test: (s) =>
      /initial.*application.*acls|acls.*initial.*application|application.*acls/i.test(
        s,
      ),
  },
  {
    category: "initial_application_pals",
    test: (s) =>
      /initial.*application.*pals|pals.*initial.*application|application.*pals/i.test(
        s,
      ),
  },
  {
    category: "monitoring_paperwork_log",
    test: (s) =>
      /monitoring.*paperwork|paperwork.*log|monitoring\s+log/i.test(s),
  },
];

/**
 * Map free-text "Document Type" from the Google Form / sheet to a portal category.
 */
export function mapDocumentTypeToCategory(
  documentType: string,
): InstructorUploadCategory | null {
  const raw = documentType.trim();
  if (!raw) return null;
  const s = raw.toLowerCase();
  for (const { category, test } of RULES) {
    if (test(s)) return category;
  }
  return null;
}
