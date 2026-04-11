import { fetchInstructorDirectory } from "@/lib/instructor-directory";
import {
  fetchInstructorFormSubmissions,
  filterSubmissionsForPerson,
  groupFormSubmissionsByCategory,
} from "@/lib/instructor-form-submissions";
import {
  encodeInstructorId,
  pickInstructorEmail,
  pickInstructorName,
} from "@/lib/instructor-id";
import type { InstructorUploadCategory } from "@/lib/instructor-uploads-store";

/** Credential columns shown on the audit “all instructors” certifications view */
export const AUDIT_CERT_COLUMNS: {
  key: InstructorUploadCategory;
  label: string;
}[] = [
  { key: "bls_provider_card", label: "BLS provider" },
  { key: "bls_instructor", label: "BLS instructor" },
  { key: "acls_provider", label: "ACLS provider" },
  { key: "acls_instructor", label: "ACLS instructor" },
  { key: "pals_provider", label: "PALS provider" },
  { key: "pals_instructor", label: "PALS instructor" },
];

export type CredentialCategoryKey = (typeof AUDIT_CERT_COLUMNS)[number]["key"];

export type InstructorCertOverviewRow = {
  instructorId: string;
  displayName: string;
  email: string;
  byCategory: Record<CredentialCategoryKey, string>;
};

/** Parse sheet/form expiration strings (e.g. 7/31/2026, YYYY-MM-DD). */
function parseFormExpiration(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t.slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (us) {
    const m = parseInt(us[1], 10);
    const day = parseInt(us[2], 10);
    const y = parseInt(us[3], 10);
    const d = new Date(y, m - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minParsedDate(rawDates: string[]): Date | null {
  let min: Date | null = null;
  for (const raw of rawDates) {
    const d = parseFormExpiration(raw);
    if (!d) continue;
    if (!min || d.getTime() < min.getTime()) min = d;
  }
  return min;
}

export type CertExpirationTone = "empty" | "invalid" | "expired" | "soon" | "ok";

/**
 * UI helper: classify a single cell for color and display text.
 */
export function certExpirationTone(raw: string): {
  tone: CertExpirationTone;
  display: string;
} {
  const t = raw.trim();
  if (!t) return { tone: "empty", display: "—" };
  const d = parseFormExpiration(raw);
  if (!d) return { tone: "invalid", display: t };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 60);

  const expired = cmp < now;
  const warn = !expired && cmp < soon;
  const display = d.toLocaleDateString();

  if (expired) return { tone: "expired", display };
  if (warn) return { tone: "soon", display };
  return { tone: "ok", display };
}

function emptyByCategory(): Record<CredentialCategoryKey, string> {
  return Object.fromEntries(
    AUDIT_CERT_COLUMNS.map((c) => [c.key, ""]),
  ) as Record<CredentialCategoryKey, string>;
}

function latestExpirationInCategory(
  grouped: ReturnType<typeof groupFormSubmissionsByCategory>,
  key: InstructorUploadCategory,
): string {
  const list = grouped.byCategory[key];
  if (!list?.length) return "";
  return list[0]!.expirationDate?.trim() ?? "";
}

export async function buildInstructorCertExpirationOverview(): Promise<{
  rows: InstructorCertOverviewRow[];
  directoryFetchedAt: string;
  formFetchedAt: string;
  formSourceUrl: string;
  formError: string | null;
}> {
  const dir = await fetchInstructorDirectory();

  let formFetchedAt = "";
  let formSourceUrl = "";
  let formError: string | null = null;
  let submissions: Awaited<
    ReturnType<typeof fetchInstructorFormSubmissions>
  > | null = null;

  try {
    submissions = await fetchInstructorFormSubmissions();
    formFetchedAt = submissions.fetchedAt;
    formSourceUrl = submissions.sourceUrl;
  } catch (e) {
    formError =
      e instanceof Error ? e.message : "Could not load instructor form sheet.";
  }

  const rows: InstructorCertOverviewRow[] = [];

  for (const person of dir.rows) {
    const displayName =
      pickInstructorName(person) || pickInstructorEmail(person) || "Instructor";
    const email = pickInstructorEmail(person);
    const instructorId = encodeInstructorId(person);
    const byCategory = emptyByCategory();

    if (submissions) {
      const mine = filterSubmissionsForPerson(submissions.submissions, person);
      const grouped = groupFormSubmissionsByCategory(mine);
      for (const { key } of AUDIT_CERT_COLUMNS) {
        byCategory[key] = latestExpirationInCategory(grouped, key);
      }
    }

    rows.push({ instructorId, displayName, email, byCategory });
  }

  rows.sort((a, b) => {
    const rawA = AUDIT_CERT_COLUMNS.map((c) => a.byCategory[c.key]);
    const rawB = AUDIT_CERT_COLUMNS.map((c) => b.byCategory[c.key]);
    const minA = minParsedDate(rawA);
    const minB = minParsedDate(rawB);
    if (minA && minB && minA.getTime() !== minB.getTime()) {
      return minA.getTime() - minB.getTime();
    }
    if (minA && !minB) return -1;
    if (!minA && minB) return 1;
    return a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    });
  });

  return {
    rows,
    directoryFetchedAt: dir.fetchedAt,
    formFetchedAt,
    formSourceUrl,
    formError,
  };
}
