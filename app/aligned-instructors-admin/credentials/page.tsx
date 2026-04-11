import Link from "next/link";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import {
  findCourseDateLabel,
  parseFirstLastName,
} from "@/lib/aligned-instructor-row-summaries";
import {
  alignedInstructorsCredentialsSheetEditUrl,
  attachCredentialsRowKeys,
  fetchAlignedInstructorsCredentialsTable,
} from "@/lib/aligned-instructors-credentials-sheet";

export const dynamic = "force-dynamic";

function pickEmail(row: Record<string, string>, headers: string[]): string {
  for (const h of headers) {
    if (/email/i.test(h.trim())) {
      const v = row[h]?.trim();
      if (v) return v;
    }
  }
  return "";
}

export default async function AlignedInstructorsCredentialsPage() {
  let headers: string[] = [];
  let fetchedAt = "";
  let loadError: string | null = null;
  let rowsWithKeys: ReturnType<typeof attachCredentialsRowKeys> = [];

  try {
    const data = await fetchAlignedInstructorsCredentialsTable();
    headers = data.headers;
    fetchedAt = data.fetchedAt;
    rowsWithKeys = attachCredentialsRowKeys(data.headers, data.rows);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load the spreadsheet.";
  }

  const sheetUrl = alignedInstructorsCredentialsSheetEditUrl();

  const tableRows = rowsWithKeys.map(({ rowKey, row }) => {
    const { firstName, lastName, fullName } = parseFirstLastName(row, headers);
    return {
      rowKey,
      firstName,
      lastName,
      displayName: fullName || "—",
      email: pickEmail(row, headers),
      courseDate: findCourseDateLabel(row, headers),
    };
  });

  tableRows.sort((a, b) => {
    const c = a.lastName.localeCompare(b.lastName, undefined, {
      sensitivity: "base",
    });
    if (c !== 0) return c;
    return a.firstName.localeCompare(b.firstName, undefined, {
      sensitivity: "base",
    });
  });

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />

      <div>
        <h2 className="text-2xl font-semibold text-white">
          Aligned instructors credentials
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Credential rows from the linked Google Sheet. Open a row for full
          field detail.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {fetchedAt ? (
            <span>Sheet refreshed {new Date(fetchedAt).toLocaleString()}</span>
          ) : null}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400/90 underline hover:text-red-300"
          >
            Open credentials spreadsheet
          </a>
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
      ) : tableRows.length === 0 ? (
        <p className="text-sm text-zinc-500">No rows in this tab.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-red-900/30 bg-[var(--surface)] p-4">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-red-900/35 text-zinc-400">
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Instructor
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Course date
                </th>
                <th className="min-w-[12rem] px-3 py-2 font-semibold">Email</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {tableRows.map((r) => (
                <tr key={r.rowKey} className="text-zinc-300">
                  <td className="px-3 py-2 text-white">{r.displayName}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {r.courseDate || "—"}
                  </td>
                  <td className="max-w-[18rem] truncate px-3 py-2 text-zinc-400">
                    {r.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/aligned-instructors-admin/credentials/${encodeURIComponent(r.rowKey)}`}
                      className="text-red-400/90 underline hover:text-red-300"
                    >
                      View
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
