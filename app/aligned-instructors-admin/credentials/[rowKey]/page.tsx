import Link from "next/link";
import { notFound } from "next/navigation";
import { AlignedInstructorCredentialFieldValue } from "@/components/AlignedInstructorCredentialFieldValue";
import { AlignedInstructorsAdminToolbar } from "@/components/AlignedInstructorsAdminToolbar";
import { parseFirstLastName } from "@/lib/aligned-instructor-row-summaries";
import { isOmittedFromCredentialsDetailHeader } from "@/lib/aligned-instructors-credentials-detail-filter";
import { getHiddenCandidateDocumentRowKeys } from "@/lib/aligned-candidate-document-hides-store";
import {
  alignedInstructorsCredentialsSheetEditUrl,
  attachCredentialsRowKeys,
  fetchAlignedInstructorsCredentialsTable,
} from "@/lib/aligned-instructors-credentials-sheet";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rowKey: string }>;
};

export default async function AlignedInstructorCredentialDetailPage({
  params,
}: Props) {
  const { rowKey: rawKey } = await params;
  let rowKey = rawKey;
  try {
    rowKey = decodeURIComponent(rawKey);
  } catch {
    notFound();
  }

  const data = await fetchAlignedInstructorsCredentialsTable();
  const { headers, rows } = data;
  const keyed = attachCredentialsRowKeys(headers, rows);
  const found = keyed.find((x) => x.rowKey === rowKey);
  if (!found) notFound();

  const hidden = await getHiddenCandidateDocumentRowKeys();
  if (hidden.has(rowKey)) notFound();

  const { row } = found;
  const { fullName } = parseFirstLastName(row, headers);
  const sheetUrl = alignedInstructorsCredentialsSheetEditUrl();

  const entries = headers
    .map((h) => {
      const v = (row[h] ?? "").trim();
      return { h, v };
    })
    .filter(
      (x) => x.v && !isOmittedFromCredentialsDetailHeader(x.h),
    );

  return (
    <div className="space-y-4">
      <AlignedInstructorsAdminToolbar />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {fullName || "Credential row"}
          </h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">{rowKey}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Sheet refreshed {new Date(data.fetchedAt).toLocaleString()} ·{" "}
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
        <Link
          href="/aligned-instructors-admin/credentials"
          className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-white"
        >
          ← Back to list
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No non-empty fields in this row.</p>
      ) : (
        <div className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
          <h3 className="text-sm font-medium text-zinc-400">Fields</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {entries.map(({ h, v }) => (
              <div key={h} className="border-b border-zinc-800/80 pb-3 sm:border-b-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {h}
                </dt>
                <dd className="mt-1 text-sm text-zinc-200">
                  <AlignedInstructorCredentialFieldValue value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
