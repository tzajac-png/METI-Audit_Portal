"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InstructorCourseSummary } from "@/lib/instructor-courses";
import type { AuditRecord } from "@/lib/audit-records-store";
import {
  COMPLIANCE_FIELD_LABELS,
  complianceCompleteRatio,
} from "@/lib/audit-constants";

type ApiGet = {
  records: AuditRecord[];
  complianceLabels: typeof COMPLIANCE_FIELD_LABELS;
};

type Props = {
  courses: InstructorCourseSummary[];
};

function latestRecordForCourse(
  courseCode: string,
  records: AuditRecord[],
): AuditRecord | null {
  const key = courseCode.trim();
  const matches = records.filter((r) => r.courseCode.trim() === key);
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime(),
  )[0];
}

function isAuditComplete(rec: AuditRecord): boolean {
  const r = complianceCompleteRatio(rec.compliance);
  return r.done === r.total;
}

function auditLabel(
  courseCode: string,
  records: AuditRecord[],
): "Complete" | "Pending" {
  const latest = latestRecordForCourse(courseCode, records);
  if (!latest) return "Pending";
  return isAuditComplete(latest) ? "Complete" : "Pending";
}

export function AuditCoursesWorkspace({ courses }: Props) {
  const [data, setData] = useState<ApiGet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-records", { credentials: "include" });
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

  const dashboardRows = useMemo(() => {
    return [...courses].sort((a, b) => {
      const ta = new Date(a.dateLabel).getTime();
      const tb = new Date(b.dateLabel).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
  }, [courses]);

  async function removeRecord(id: string) {
    if (!confirm("Delete this audit record?")) return;
    const res = await fetch(`/api/audit-records?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) void refresh();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/audit/courses/new"
          className="rounded-lg border border-red-600/60 bg-red-950/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/80"
        >
          Create a new audit
        </Link>
        <span className="text-xs text-zinc-500">
          Opens the full audit form on its own page.
        </span>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">All classes — audit status</h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="text-emerald-400/90">Complete</span> when the latest
          saved audit for that class has every compliance item checked. Otherwise{" "}
          <span className="text-amber-200/90">Pending</span>.
        </p>

        {loadError ? (
          <p className="mt-4 text-red-400">{loadError}</p>
        ) : !data ? (
          <p className="mt-6 text-zinc-500">Loading audit status…</p>
        ) : dashboardRows.length === 0 ? (
          <p className="mt-6 text-zinc-500">No courses loaded from spreadsheets.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Program</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Course</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Class date</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Location</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Lead instructor
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
                {dashboardRows.map((row) => {
                  const status = auditLabel(row.courseCode, records);
                  return (
                    <tr key={`${row.courseType}-${row.courseCode}`} className="text-zinc-300">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-red-300/90">
                        {row.courseType}
                      </td>
                      <td className="max-w-[16rem] px-3 py-2 font-mono text-xs">
                        {row.courseCode}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{row.dateLabel}</td>
                      <td className="px-3 py-2">{row.location}</td>
                      <td className="px-3 py-2">{row.leadInstructor}</td>
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
                          href={`/audit/courses/new?courseCode=${encodeURIComponent(row.courseCode)}`}
                          className="text-red-400/90 underline hover:text-red-300"
                        >
                          Audit this class
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
          Saved audit submissions with compliance progress and optional files. Use{" "}
          <span className="text-zinc-400">Edit</span> to open the form on a detail page.
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
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Submitted</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Updated</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Course</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Location</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Instructor
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Auditor</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Compliance
                  </th>
                  <th className="px-3 py-2 font-semibold">eCard / file</th>
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
                      <td className="max-w-[14rem] px-3 py-2 font-mono text-xs">
                        {r.courseCode}
                      </td>
                      <td className="px-3 py-2">{r.courseLocation}</td>
                      <td className="px-3 py-2">{r.leadInstructor}</td>
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
                      <td className="px-3 py-2">
                        {r.ecardFile ? (
                          <a
                            href={`/api/audit-records/${r.id}/download`}
                            className="text-red-400 hover:text-red-300 hover:underline"
                          >
                            {r.ecardFile.originalName}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/audit/courses/${encodeURIComponent(r.id)}/edit`}
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
