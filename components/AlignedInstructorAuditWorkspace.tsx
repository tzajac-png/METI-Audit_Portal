"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlignedInstructorAuditRecord } from "@/lib/aligned-instructor-audit-store";
import {
  parseFirstLastName,
  type AlignedInstructorRowSummary,
} from "@/lib/aligned-instructor-row-summaries";
import {
  ALIGNED_PORTAL_SUBMISSION_LABELS,
  type AlignedPortalSubmissionStatus,
  type AlignedSubmissionEntry,
} from "@/lib/aligned-instructor-submission-types";
import {
  COMPLIANCE_FIELD_LABELS,
  complianceCompleteRatio,
} from "@/lib/audit-constants";

type ApiAudits = {
  records: AlignedInstructorAuditRecord[];
  complianceLabels: typeof COMPLIANCE_FIELD_LABELS;
};

type ApiSubmissions = {
  entries: AlignedSubmissionEntry[];
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

function auditStatusLabel(
  rowKey: string,
  records: AlignedInstructorAuditRecord[],
): "Complete" | "Pending" {
  const latest = latestForRowKey(rowKey, records);
  if (!latest) return "Pending";
  return isComplete(latest) ? "Complete" : "Pending";
}

const STATUS_OPTIONS: AlignedPortalSubmissionStatus[] = [
  "reviewed",
  "payment_collected_submitted_cards",
  "holding_class_payment",
  "cards_issued",
];

export function AlignedInstructorAuditWorkspace({
  rosterRows,
}: Props) {
  const [data, setData] = useState<ApiAudits | null>(null);
  const [submissions, setSubmissions] = useState<AlignedSubmissionEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [resAud, resSub] = await Promise.all([
        fetch("/api/aligned-instructor-audits", { credentials: "include" }),
        fetch("/api/aligned-instructor-submission", { credentials: "include" }),
      ]);
      if (!resAud.ok) {
        setLoadError("Could not load audit records.");
        return;
      }
      if (!resSub.ok) {
        setLoadError("Could not load submission status.");
        return;
      }
      const jsonAud = (await resAud.json()) as ApiAudits;
      const jsonSub = (await resSub.json()) as ApiSubmissions;
      setData(jsonAud);
      setSubmissions(jsonSub.entries ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Could not load data.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const records = data?.records ?? [];

  const subByRowKey = useMemo(() => {
    return new Map(submissions.map((e) => [e.rowKey, e]));
  }, [submissions]);

  const sortedRoster = useMemo(() => {
    return [...rosterRows].sort((a, b) => {
      const lb = a.lastName.localeCompare(b.lastName, undefined, {
        sensitivity: "base",
      });
      if (lb !== 0) return lb;
      return a.firstName.localeCompare(b.firstName, undefined, {
        sensitivity: "base",
      });
    });
  }, [rosterRows]);

  async function removeRecord(id: string) {
    if (!confirm("Delete this audit record?")) return;
    const res = await fetch(
      `/api/aligned-instructor-audits?id=${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" },
    );
    if (res.ok) void refresh();
  }

  async function openRow(rowKey: string) {
    const res = await fetch("/api/aligned-instructor-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowKey, action: "open" }),
      credentials: "include",
    });
    if (res.ok) void refresh();
  }

  async function changeSubmissionStatus(
    rowKey: string,
    status: AlignedPortalSubmissionStatus,
  ) {
    const res = await fetch("/api/aligned-instructor-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowKey, action: "set_status", status }),
      credentials: "include",
    });
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
          Rows show <span className="text-sky-300">New submission</span> until you
          open them; then set processing status from the list.
        </span>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          All roster rows — submission & audit
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="text-sky-300/90">New submission</span> until the row is
          opened (Open row or Audit this row). Then choose status: Reviewed, payment
          / cards, etc.{" "}
          <span className="text-emerald-400/90">Audit complete</span> when the latest
          audit has every compliance item checked.
        </p>

        {loadError ? (
          <p className="mt-4 text-red-400">{loadError}</p>
        ) : !data ? (
          <p className="mt-6 text-zinc-500">Loading…</p>
        ) : sortedRoster.length === 0 ? (
          <p className="mt-6 text-zinc-500">No rows in the aligned instructors sheet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    First name
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Last name
                  </th>
                  <th className="min-w-[14rem] px-3 py-2 font-semibold">
                    Submission status
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Audit status
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {sortedRoster.map((row) => {
                  const sub = subByRowKey.get(row.rowKey);
                  const opened = !!sub;
                  const auditSt = auditStatusLabel(row.rowKey, records);
                  return (
                    <tr key={row.rowKey} className="text-zinc-300">
                      <td className="whitespace-nowrap px-3 py-2 text-white">
                        {row.firstName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-white">
                        {row.lastName || "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {!opened ? (
                          <span className="inline-flex rounded bg-sky-950/60 px-2 py-0.5 text-xs font-medium text-sky-200">
                            New submission
                          </span>
                        ) : (
                          <select
                            value={sub.status}
                            onChange={(e) =>
                              void changeSubmissionStatus(
                                row.rowKey,
                                e.target.value as AlignedPortalSubmissionStatus,
                              )
                            }
                            className="max-w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                            aria-label={`Submission status for ${row.displayLabel}`}
                          >
                            {STATUS_OPTIONS.map((v) => (
                              <option key={v} value={v}>
                                {ALIGNED_PORTAL_SUBMISSION_LABELS[v]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {auditSt === "Complete" ? (
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
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                          {!opened ? (
                            <button
                              type="button"
                              onClick={() => void openRow(row.rowKey)}
                              className="w-fit text-left text-xs text-sky-400/90 underline hover:text-sky-300"
                            >
                              Open row
                            </button>
                          ) : null}
                          <Link
                            href={`/aligned-instructors-admin/new?rowKey=${encodeURIComponent(row.rowKey)}`}
                            className="text-xs text-red-400/90 underline hover:text-red-300"
                          >
                            Audit this row
                          </Link>
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
                    First
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Last
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
                  const snap = r.rowSnapshot;
                  const headers = Object.keys(snap);
                  const { firstName, lastName } = parseFirstLastName(snap, headers);
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
                      <td className="whitespace-nowrap px-3 py-2">
                        {firstName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {lastName || "—"}
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
