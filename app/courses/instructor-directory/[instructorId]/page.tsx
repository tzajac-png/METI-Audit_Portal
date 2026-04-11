import { notFound } from "next/navigation";
import Link from "next/link";
import { InstructorDocumentUploads } from "@/components/InstructorDocumentUploads";
import {
  decodeInstructorId,
  findInstructorRowByDecodedId,
  pickInstructorEmail,
  pickInstructorName,
} from "@/lib/instructor-id";
import { fetchInstructorDirectory } from "@/lib/instructor-directory";
import {
  fetchInstructorFormSubmissions,
  filterSubmissionsForPerson,
  groupFormSubmissionsByCategory,
} from "@/lib/instructor-form-submissions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ instructorId: string }>;
};

/** Omitted from detail — shown as tiles on directory or managed under uploads */
const HIDDEN_ROSTER_KEYS = new Set([
  "Photo",
  "BLS Card",
  "ACLS Card",
  "PALS Card",
]);

/** Column order matches the Instructor Roster tab (gid 482270132); hidden keys skipped. */
const DEMO_PRIORITY = [
  "Name",
  "Instructor Initials",
  "Title",
  "Email",
  "Phone",
  "EMS License Number",
  "Disciplines",
  "Instructor Number",
  "BLS-I Code",
  "BLS-I Renewal",
  "ACLS-I Code",
  "ACLS-I Renewal",
  "PALS-I Code",
  "PALS-I Renewal",
  "PHTLS-I",
  "PHTLS-Cert",
  "Instructor Edition",
  "Committees",
  "Polo Shirt Size",
  "1/4 Zip Size",
];

export default async function InstructorDirectoryDetailPage({ params }: Props) {
  const { instructorId: rawSegment } = await params;
  let segment = rawSegment;
  try {
    segment = decodeURIComponent(rawSegment);
  } catch {
    notFound();
  }

  const decoded = decodeInstructorId(segment);
  if (!decoded) notFound();

  const { rows, fetchedAt } = await fetchInstructorDirectory();
  const person = findInstructorRowByDecodedId(rows, decoded);
  if (!person) notFound();

  let formSubmissionsByCategory: ReturnType<
    typeof groupFormSubmissionsByCategory
  >["byCategory"] = {};
  let formSubmissionsUnmapped: ReturnType<
    typeof groupFormSubmissionsByCategory
  >["unmapped"] = [];
  try {
    const { submissions } = await fetchInstructorFormSubmissions();
    const mine = filterSubmissionsForPerson(submissions, person);
    const grouped = groupFormSubmissionsByCategory(mine);
    formSubmissionsByCategory = grouped.byCategory;
    formSubmissionsUnmapped = grouped.unmapped;
  } catch {
    /* Sheet tab optional — page still loads without form data */
  }

  const allKeys = Object.keys(person).filter(
    (k) => k.trim() !== "" && !HIDDEN_ROSTER_KEYS.has(k),
  );
  const prioritySet = new Set(DEMO_PRIORITY);
  const ordered = [
    ...DEMO_PRIORITY.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !prioritySet.has(k)).sort((a, b) => a.localeCompare(b)),
  ];

  const displayName =
    pickInstructorName(person) ||
    pickInstructorEmail(person) ||
    "Instructor";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/courses/instructor-directory"
            className="text-sm text-red-400/90 hover:text-red-300"
          >
            ← Instructor Directory
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            {displayName}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Roster record · refreshed{" "}
            {new Date(fetchedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          Contact & roster fields
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Roster data from Google Sheets. Photo and eCard links are not listed
          here — use the directory tiles and document sections below.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {ordered.map((key) => {
            const val = person[key];
            if (val == null || String(val).trim() === "") return null;
            return (
              <div
                key={key}
                className="border-b border-zinc-800/80 pb-3 sm:border-b-0"
              >
                <dt className="text-xs font-medium text-zinc-500">{key}</dt>
                <dd className="mt-0.5 break-words text-sm text-zinc-200">
                  {val}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white" id="instructor-uploads">
          Documents
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Organized by program (BLS, ACLS, PALS). Data comes from the instructor
          document Google Form; expiration for each credential uses the latest
          filing for that type.
        </p>
        <div className="mt-6">
          <InstructorDocumentUploads
            formSubmissionsByCategory={formSubmissionsByCategory}
            formSubmissionsUnmapped={formSubmissionsUnmapped}
          />
        </div>
      </section>
    </div>
  );
}
