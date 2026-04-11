import Link from "next/link";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import {
  candidateFirstLastFromRows,
  candidateProfileSlugFromNormalizedKey,
  findInstructorNameInRow,
  findRosterRowKeyForCandidateName,
  normalizeInstructorKey,
  summarizeCandidateSubmissionLabels,
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

type CandidateSummary = {
  normalizedKey: string;
  displayName: string;
  firstName: string;
  lastName: string;
  submissionCount: number;
  submissionStatusLabel: string;
  rosterRowKey: string | null;
  profileSlug: string;
};

export default async function AlignedInstructorsCredentialsPage() {
  let headers: string[] = [];
  let fetchedAt = "";
  let loadError: string | null = null;
  let rowsWithKeys = attachCredentialsRowKeys([], []);

  let rosterSummaries = buildAlignedInstructorRowSummaries([], []);

  try {
    const data = await fetchAlignedInstructorsCredentialsTable();
    headers = data.headers;
    fetchedAt = data.fetchedAt;
    rowsWithKeys = attachCredentialsRowKeys(data.headers, data.rows);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load the spreadsheet.";
  }

  try {
    const roster = await fetchMetiBlsInstructorsTable();
    rosterSummaries = buildAlignedInstructorRowSummaries(
      roster.headers,
      roster.rows,
    );
  } catch {
    /* roster optional for links */
  }

  const hidden = await getHiddenCandidateDocumentRowKeys();
  const visibleRows = rowsWithKeys.filter((x) => !hidden.has(x.rowKey));

  const groupMap = new Map<
    string,
    { displayName: string; rows: Record<string, string>[] }
  >();

  for (const { row } of visibleRows) {
    const name = findInstructorNameInRow(row, headers);
    const nk = normalizeInstructorKey(name);
    if (!nk) continue;
    const prev = groupMap.get(nk);
    if (prev) {
      prev.rows.push(row);
    } else {
      groupMap.set(nk, {
        displayName: name.trim() || "Unknown",
        rows: [row],
      });
    }
  }

  const candidates: CandidateSummary[] = [...groupMap.entries()]
    .map(([normalizedKey, { displayName, rows }]) => {
      const { firstName, lastName } = candidateFirstLastFromRows(
        rows,
        headers,
        displayName,
      );
      return {
        normalizedKey,
        displayName,
        firstName,
        lastName,
        submissionCount: rows.length,
        submissionStatusLabel: summarizeCandidateSubmissionLabels(rows, headers),
        rosterRowKey: findRosterRowKeyForCandidateName(
          displayName,
          rosterSummaries,
        ),
        profileSlug: candidateProfileSlugFromNormalizedKey(normalizedKey),
      };
    })
    .sort((a, b) => {
      const lb = a.lastName.localeCompare(b.lastName, undefined, {
        sensitivity: "base",
      });
      if (lb !== 0) return lb;
      return a.firstName.localeCompare(b.firstName, undefined, {
        sensitivity: "base",
      });
    });

  const sheetUrl = alignedInstructorsCredentialsSheetEditUrl();

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />

      <div>
        <h2 className="text-2xl font-semibold text-white">
          AHA alignment — candidate documents
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Rows from the instructor candidate tab in the linked workbook (same source as
          the aligned roster unless you override{" "}
          <span className="font-mono text-zinc-500">
            GOOGLE_SHEET_GID_ALIGNED_INSTRUCTOR_CREDENTIALS
          </span>
          ). Open a candidate for full detail. Removing a row here only hides it in the
          portal.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-950/70"
          >
            Open candidate spreadsheet tab
          </a>
          {fetchedAt ? (
            <span className="text-xs text-zinc-500">
              Sheet refreshed {new Date(fetchedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          <p className="font-medium text-amber-100">Sheet did not load</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Confirm <span className="font-mono text-zinc-400">GOOGLE_SHEETS_API_KEY</span>{" "}
            and sheet access.
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No candidate submissions yet (or all are hidden from the portal).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-red-900/30 bg-[var(--surface)] p-4">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-red-900/35 text-zinc-400">
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  First name
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Last name
                </th>
                <th className="min-w-[12rem] px-3 py-2 font-semibold">
                  Submission status
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Documents
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Roster audit
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Profile
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {candidates.map((c) => (
                <tr key={c.normalizedKey} className="text-zinc-300">
                  <td className="whitespace-nowrap px-3 py-2 text-white">
                    {c.firstName || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-white">
                    {c.lastName || "—"}
                  </td>
                  <td className="max-w-[20rem] px-3 py-2 text-zinc-200">
                    {c.submissionStatusLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {c.submissionCount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {c.rosterRowKey ? (
                      <Link
                        href={`/aligned-instructors-admin/new?rowKey=${encodeURIComponent(c.rosterRowKey)}`}
                        className="text-red-400/90 underline hover:text-red-300"
                      >
                        Audit this row
                      </Link>
                    ) : (
                      <span className="text-zinc-600">No roster match</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/aligned-instructors-admin/credentials/candidate/${encodeURIComponent(c.profileSlug)}`}
                      className="text-red-400/90 underline hover:text-red-300"
                    >
                      View candidate profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
