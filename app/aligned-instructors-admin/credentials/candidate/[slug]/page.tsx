import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateProfileLayout } from "@/components/CandidateProfileLayout";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import {
  findInstructorNameInRow,
  findRosterRowKeyForCandidateName,
  normalizedKeyFromCandidateProfileSlug,
  normalizeInstructorKey,
  rowToCandidateSubmission,
} from "@/lib/aha-alignment-candidate-helpers";
import {
  buildCandidateNameHero,
  groupMergedFieldsBySection,
  mergeCandidateSheetFields,
} from "@/lib/aha-candidate-profile-layout";
import { getHiddenCandidateDocumentRowKeys } from "@/lib/aligned-candidate-document-hides-store";
import {
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

  const keyedVisible = keyed
    .filter((x) => !hidden.has(x.rowKey))
    .filter(
      (x) =>
        normalizeInstructorKey(findInstructorNameInRow(x.row, headers)) ===
        targetKey,
    );

  const submissions = keyedVisible.map(({ row, rowKey }) =>
    rowToCandidateSubmission(row, headers, rowKey),
  );

  const merged = mergeCandidateSheetFields(
    keyedVisible.map(({ row, rowKey }) => ({ row, rowKey })),
    headers,
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

  const hero = buildCandidateNameHero(merged, displayName);
  const sections = groupMergedFieldsBySection(
    merged,
    hero.excludeHeaders,
    headers,
  );

  const rosterRowKey = findRosterRowKeyForCandidateName(
    submissions[0]?.instructorName ?? displayName,
    rosterSummaries,
  );

  return (
    <div className="space-y-8">
      <AlignedInstructorsAdminToolbar />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            AHA alignment candidate
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Data refreshed {new Date(data.fetchedAt).toLocaleString()}
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

      <div className="rounded-2xl border border-red-900/25 bg-[var(--surface)] p-6 sm:p-10">
        {merged.length === 0 && submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No data for this candidate (or everything was removed from the
            portal).
          </p>
        ) : (
          <CandidateProfileLayout
            hero={hero}
            sections={sections}
            submissions={submissions}
          />
        )}
      </div>
    </div>
  );
}
