import { AlignedInstructorAuditWorkspace } from "@/components/AlignedInstructorAuditWorkspace";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import { buildAlignedInstructorRowSummaries } from "@/lib/aligned-instructor-row-summaries";
import {
  fetchMetiBlsInstructorsTable,
  metiBlsInstructorsSheetEditUrl,
} from "@/lib/meti-bls-instructors-sheet";

export const dynamic = "force-dynamic";

export default async function AlignedInstructorsAdminPage() {
  let summaries = buildAlignedInstructorRowSummaries([], []);
  let fetchedAt = "";
  let loadError: string | null = null;

  try {
    const data = await fetchMetiBlsInstructorsTable();
    summaries = buildAlignedInstructorRowSummaries(data.headers, data.rows);
    fetchedAt = data.fetchedAt;
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load the spreadsheet.";
  }

  const sheetUrl = metiBlsInstructorsSheetEditUrl();

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />

      <div>
        <h2 className="text-2xl font-semibold text-white">
          BLS AHA aligned instructors
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Roster from Google Sheets with the same audit workflow as course
          audits: pending vs complete by compliance checklist, audit history,
          and Tyler Zajac / Ben Bonathan as auditors.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {fetchedAt ? (
            <span>Roster refreshed {new Date(fetchedAt).toLocaleString()}</span>
          ) : null}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400/90 underline hover:text-red-300"
          >
            Open in Google Sheets
          </a>
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          <p className="font-medium text-amber-100">Sheet did not load</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Audit records can still load below if the API is configured. Fix
            sheet access for the roster table.
          </p>
        </div>
      ) : null}

      <AlignedInstructorAuditWorkspace rosterRows={summaries} />
    </div>
  );
}
