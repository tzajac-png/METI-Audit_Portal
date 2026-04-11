"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlignedInstructorAuditRecord } from "@/lib/aligned-instructor-audit-store";
import type { AlignedInstructorRowSummary } from "@/lib/aligned-instructor-row-summaries";
import {
  COMPLIANCE_FIELD_LABELS,
  complianceCompleteRatio,
} from "@/lib/audit-constants";

type ApiGet = {
  records: AlignedInstructorAuditRecord[];
  complianceLabels: typeof COMPLIANCE_FIELD_LABELS;
};

type Props = {
  rosterRows: AlignedInstructorRowSummary[];
};

function latestForRowKey(
  rowKey: string,
  records: AlignedInstructorAuditRecord[],
): AlignedInstructorAuditRecord | null {
  const matches = records.filter((r) => r.rowKey === rowKey);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0]!;
}

function isComplete(rec: AlignedInstructorAuditRecord): boolean {
  const r = complianceCompleteRatio(rec.compliance);
  return r.done === r.total;
}

function statusLabel(
  rowKey: string,
  records: AlignedInstructorAuditRecord[],
): "Complete" | "Pending" {
  const latest = latestForRowKey(rowKey, records);
  if (!latest) return "Pending";
  return isComplete(latest) ? "Complete" : "Pending";
}

export function AlignedInstructorAuditWorkspace({
  rosterRows,
}: Props) {
  const [data, setData] = useState<ApiGet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/aligned-instructor-audits", {
        credentials: "include",
      });
      if (!res.ok) {
        setLoadError("Could not load audit records.");
        return;
      }
      const json = (await res.json()) as ApiGet;
      setData(json);
      setLoadError(null);
    } catch {
      setLoadError("Could not load audit records.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const records = data?.records ?? [];

  const sortedRoster = useMemo(() => {
    return [...rosterRows].sort((a, b) =>
      a.displayLabel.localeCompare(b.displayLabel, undefined, {
        sensitivity: "base",
      }),
    );
  }, [rosterRows]);

  async function removeRecord(id: string) {
    if (!confirm("Delete this audit record?")) return;
    const res = await fetch(
      `/api/aligned-instructor-audits?id=${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" },
    );
    if (res.ok) void refresh();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/aligned-instructors-admin/new"
          className="rounded-lg border border-red-600/60 bg-red-950/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/80"
        >
          Create a new audit
        </Link>
        <span className="text-xs text-zinc-500">
          Opens the audit form for one roster row from the sheet.
        </span>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          All roster rows — audit status
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="text-emerald-400/90">Complete</span> when the latest
          saved audit for that row has every compliance item checked. Otherwise{" "}
          <span className="text-amber-200/90">Pending</span>.
        </p>

        {loadError ? (
          <p className="mt-4 text-red-400">{loadError}</p>
        ) : !data ? (
          <p className="mt-6 text-zinc-500">Loading audit status…</p>
        ) : sortedRoster.length === 0 ? (
          <p className="mt-6 text-zinc-500">No rows in the aligned instructors sheet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Instructor / row
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Audit status
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Audit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {sortedRoster.map((row) => {
                  const status = statusLabel(row.rowKey, records);
                  return (
                    <tr key={row.rowKey} className="text-zinc-300">
                      <td className="max-w-[24rem] px-3 py-2 font-medium text-white">
                        {row.displayLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {status === "Complete" ? (
                          <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                            Complete
                          </span>
                        ) : (
                          <span className="rounded bg-amber-950/50 px-2 py-0.5 text-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link
                          href={`/aligned-instructors-admin/new?rowKey=${encodeURIComponent(row.rowKey)}`}
                          className="text-red-400/90 underline hover:text-red-300"
                        >
                          Audit this row
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Audit history</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Saved aligned-instructor audits. Use{" "}
          <span className="text-zinc-400">Edit</span> to update compliance or
          notes.
        </p>

        {loadError ? (
          <p className="mt-4 text-red-400">{loadError}</p>
        ) : !data ? (
          <p className="mt-6 text-zinc-500">Loading…</p>
        ) : data.records.length === 0 ? (
          <p className="mt-6 text-zinc-500">No audit records yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Submitted
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Updated
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Row
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Auditor
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Compliance
                  </th>
                  <th className="px-3 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {data.records.map((r) => {
                  const ratio = complianceCompleteRatio(r.compliance);
                  return (
                    <tr key={r.id} className="align-top text-zinc-300">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                        {new Date(r.auditedAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-500">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="max-w-[16rem] px-3 py-2">
                        {r.displayLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-red-300">
                        {r.auditorName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={
                            ratio.done === ratio.total
                              ? "text-emerald-400"
                              : "text-amber-200/90"
                          }
                        >
                          {ratio.done}/{ratio.total}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/aligned-instructors-admin/${encodeURIComponent(r.id)}/edit`}
                            className="text-xs text-red-400/90 hover:text-red-300"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => void removeRecord(r.id)}
                            className="text-xs text-zinc-500 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
