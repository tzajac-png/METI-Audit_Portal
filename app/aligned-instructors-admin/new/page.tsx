import { AlignedInstructorAuditForm } from "@/components/AlignedInstructorAuditForm";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import { buildAlignedInstructorRowSummaries } from "@/lib/aligned-instructor-row-summaries";
import { fetchMetiBlsInstructorsTable } from "@/lib/meti-bls-instructors-sheet";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ rowKey?: string }>;
};

export default async function NewAlignedInstructorAuditPage({
  searchParams,
}: Props) {
  const { rowKey: initialRowKey } = await searchParams;

  let summaries = buildAlignedInstructorRowSummaries([], []);
  let loadError: string | null = null;

  try {
    const data = await fetchMetiBlsInstructorsTable();
    summaries = buildAlignedInstructorRowSummaries(data.headers, data.rows);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load the spreadsheet.";
  }

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />
      <div>
        <h1 className="text-2xl font-semibold text-white">New aligned audit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Choose a roster row, complete the checklist, and save.
        </p>
      </div>
      {loadError ? (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          <p className="font-medium text-amber-100">Sheet did not load</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}
      <AlignedInstructorAuditForm
        rosterRows={summaries}
        initialRowKey={initialRowKey}
      />
    </div>
  );
}
