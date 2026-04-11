import { AlignedInstructorAuditForm } from "@/components/AlignedInstructorAuditForm";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import { buildAlignedInstructorRowSummaries } from "@/lib/aligned-instructor-row-summaries";
import { fetchMetiBlsInstructorsTable } from "@/lib/meti-bls-instructors-sheet";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ recordId: string }>;
};

export default async function EditAlignedInstructorAuditPage({ params }: Props) {
  const { recordId } = await params;

  let summaries = buildAlignedInstructorRowSummaries([], []);
  try {
    const data = await fetchMetiBlsInstructorsTable();
    summaries = buildAlignedInstructorRowSummaries(data.headers, data.rows);
  } catch {
    /* edit form loads row from saved audit */
  }

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Edit aligned instructor audit
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update compliance, notes, or auditor, then save.
        </p>
      </div>
      <AlignedInstructorAuditForm
        rosterRows={summaries}
        editRecordId={recordId}
      />
    </div>
  );
}
