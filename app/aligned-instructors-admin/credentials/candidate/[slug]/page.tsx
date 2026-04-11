import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateDocumentSubmissionsList } from "@/components/CandidateDocumentSubmissionsList";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import {
  findRosterRowKeyForCandidateName,
  normalizedKeyFromCandidateProfileSlug,
  normalizeInstructorKey,
  rowToCandidateSubmission,
} from "@/lib/aha-alignment-candidate-helpers";
import { getHiddenCandidateDocumentRowKeys } from "@/lib/aligned-candidate-document-hides-store";
import {
  alignedInstructorsCredentialsSheetEditUrl,
  attachCredentialsRowKeys,
  fetchAlignedInstructorsCredentialsTable,
} from "@/lib/aligned-instructors-credentials-sheet";
import { buildAlignedInstructorRowSummaries } from "@/lib/aligned-instructor-row-summaries";
import { fetchMetiBlsInstructorsTable } from "@/lib/meti-bls-instructors-sheet";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AhaAlignmentCandidateProfilePage({ params }: Props) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    notFound();
  }

  const targetKey = normalizedKeyFromCandidateProfileSlug(slug);
  if (!targetKey) notFound();

  const hidden = await getHiddenCandidateDocumentRowKeys();
  const data = await fetchAlignedInstructorsCredentialsTable();
  const { headers, rows } = data;
  const keyed = attachCredentialsRowKeys(headers, rows);

  const submissions = keyed
    .filter((x) => !hidden.has(x.rowKey))
    .map(({ row, rowKey }) => rowToCandidateSubmission(row, headers, rowKey))
    .filter(
      (s) => normalizeInstructorKey(s.instructorName) === targetKey,
    );

  let rosterSummaries = buildAlignedInstructorRowSummaries([], []);
  try {
    const roster = await fetchMetiBlsInstructorsTable();
    rosterSummaries = buildAlignedInstructorRowSummaries(
      roster.headers,
      roster.rows,
    );
  } catch {
    /* optional */
  }

  const displayName =
    submissions[0]?.instructorName.trim() ||
    targetKey
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");

  const rosterRowKey = findRosterRowKeyForCandidateName(
    submissions[0]?.instructorName ?? displayName,
    rosterSummaries,
  );

  const sheetUrl = alignedInstructorsCredentialsSheetEditUrl();

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            AHA alignment candidate — document submissions from the spreadsheet.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span>Sheet refreshed {new Date(data.fetchedAt).toLocaleString()}</span>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400/90 underline hover:text-red-300"
            >
              Open candidate spreadsheet tab
            </a>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {rosterRowKey ? (
              <Link
                href={`/aligned-instructors-admin/new?rowKey=${encodeURIComponent(rosterRowKey)}`}
                className="inline-flex rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-950/70"
              >
                Audit roster row
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-500">
                No matching BLS aligned roster row
              </span>
            )}
          </div>
        </div>
        <Link
          href="/aligned-instructors-admin/credentials"
          className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-white"
        >
          ← All candidates
        </Link>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h3 className="text-sm font-medium text-zinc-400">Submitted documents</h3>
        <p className="mt-1 text-xs text-zinc-600">
          Links come from the <span className="text-zinc-500">Upload Document</span>{" "}
          column. Remove from portal hides a submission here only.
        </p>
        <div className="mt-4">
          <CandidateDocumentSubmissionsList submissions={submissions} />
        </div>
      </section>
    </div>
  );
}
