import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import {
  fetchMetiBlsInstructorsTable,
  metiBlsInstructorsSheetEditUrl,
} from "@/lib/meti-bls-instructors-sheet";

export const dynamic = "force-dynamic";

export default async function AlignedInstructorsAdminPage() {
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  let sourceUrl = "";
  let fetchedAt = "";
  let loadError: string | null = null;

  try {
    const data = await fetchMetiBlsInstructorsTable();
    headers = data.headers;
    rows = data.rows;
    sourceUrl = data.sourceUrl;
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
        <h2 className="text-xl font-semibold text-white">
          BLS AHA instructors roster
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Instructors aligned under METI for BLS AHA classes. Data is read from
          the linked Google Sheet (hidden rows/columns respected when using the
          Sheets API).
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {fetchedAt ? (
            <span>Refreshed {new Date(fetchedAt).toLocaleString()}</span>
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
            Ensure <code className="text-zinc-400">GOOGLE_SHEETS_API_KEY</code>{" "}
            can access this workbook, or share the sheet for viewing.
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h3 className="text-lg font-semibold text-white">Roster</h3>
        <p className="mt-1 text-sm text-zinc-500">
          All rows from the sheet tab. Empty rows are omitted.
        </p>

        {rows.length === 0 && !loadError ? (
          <p className="mt-6 text-zinc-500">No data rows in this tab.</p>
        ) : headers.length > 0 && rows.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="whitespace-nowrap px-3 py-2 font-semibold"
                    >
                      {h || "—"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((row, ri) => (
                  <tr key={ri} className="text-zinc-300">
                    {headers.map((h, hi) => (
                      <td
                        key={`${ri}-${hi}`}
                        className="max-w-[20rem] px-3 py-2 align-top break-words"
                      >
                        {row[h]?.trim() ? (
                          /^https?:\/\//i.test(row[h].trim()) ? (
                            <a
                              href={row[h].trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400/90 underline hover:text-red-300"
                            >
                              Link
                            </a>
                          ) : (
                            row[h]
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {sourceUrl ? (
          <p className="mt-4 text-xs text-zinc-600">
            Source:{" "}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline hover:text-zinc-400"
            >
              sheet data URL
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
