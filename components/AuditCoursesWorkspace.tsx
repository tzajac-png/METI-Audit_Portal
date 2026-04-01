"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InstructorCourseSummary } from "@/lib/instructor-courses";
import type { AuditRecord } from "@/lib/audit-records-store";
import type { ComplianceChecklist } from "@/lib/audit-constants";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  complianceCompleteRatio,
  emptyCompliance,
} from "@/lib/audit-constants";

type ApiGet = {
  records: AuditRecord[];
  auditors: typeof AUDITOR_OPTIONS;
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
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [data, setData] = useState<ApiGet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [courseCode, setCourseCode] = useState("");
  const [courseDateLabel, setCourseDateLabel] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [leadInstructor, setLeadInstructor] = useState("");
  const [auditorName, setAuditorName] = useState<(typeof AUDITOR_OPTIONS)[number]>(
    AUDITOR_OPTIONS[0],
  );
  const [notes, setNotes] = useState("");
  const [compliance, setCompliance] = useState<ComplianceChecklist>(emptyCompliance());
  const [file, setFile] = useState<File | null>(null);

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

  function applyCourseSelection(code: string) {
    setCourseCode(code);
    const c = courses.find((x) => x.courseCode === code);
    if (c) {
      setCourseDateLabel(c.dateLabel);
      setCourseLocation(c.location);
      setLeadInstructor(c.leadInstructor);
    } else {
      setCourseDateLabel("");
      setCourseLocation("");
      setLeadInstructor("");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseCode.trim()) {
      setSubmitError("Select a course.");
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("courseCode", courseCode.trim());
      fd.set("auditorName", auditorName);
      fd.set("notes", notes);
      fd.set("courseDateLabel", courseDateLabel);
      fd.set("courseLocation", courseLocation);
      fd.set("leadInstructor", leadInstructor);
      (Object.keys(compliance) as (keyof ComplianceChecklist)[]).forEach((k) => {
        fd.set(`compliance_${k}`, compliance[k] ? "true" : "false");
      });
      if (file) fd.set("ecardFile", file);

      const res = await fetch("/api/audit-records", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(j.error ?? "Save failed.");
        return;
      }
      setNotes("");
      setFile(null);
      setCompliance(emptyCompliance());
      await refresh();
    } catch {
      setSubmitError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this audit record?")) return;
    const res = await fetch(`/api/audit-records?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) void refresh();
  }

  const labels = data?.complianceLabels ?? COMPLIANCE_FIELD_LABELS;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowRecordForm((v) => !v)}
          className="rounded-lg border border-red-600/60 bg-red-950/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/80"
        >
          {showRecordForm ? "Hide record form" : "Record a course audit"}
        </button>
        <span className="text-xs text-zinc-500">
          Open the full audit form only when you are ready to submit.
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showRecordForm ? (
      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Record a course audit</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose the class, auditor, compliance checklist, optional eCard / document
          upload, and notes. Only Tyler Zajac or Ben Bonathan may be selected as
          auditor.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
                Course
              </span>
              <select
                required
                value={courseCode}
                onChange={(e) => applyCourseSelection(e.target.value)}
                className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={`${c.courseType}-${c.courseCode}`} value={c.courseCode}>
                    [{c.courseType}] {c.courseCode} — {c.dateLabel} — {c.location}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Class date (snapshot)
              </span>
              <input
                type="text"
                value={courseDateLabel}
                onChange={(e) => setCourseDateLabel(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Location
              </span>
              <input
                type="text"
                value={courseLocation}
                onChange={(e) => setCourseLocation(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Lead instructor
              </span>
              <input
                type="text"
                value={leadInstructor}
                onChange={(e) => setLeadInstructor(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
                Auditor
              </span>
              <select
                required
                value={auditorName}
                onChange={(e) =>
                  setAuditorName(e.target.value as (typeof AUDITOR_OPTIONS)[number])
                }
                className="w-full max-w-md rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/60 focus:outline-none"
              >
                {AUDITOR_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <legend className="px-1 text-sm font-medium text-white">
              Compliance checklist
            </legend>
            <ul className="mt-3 space-y-2">
              {(Object.keys(emptyCompliance()) as (keyof ComplianceChecklist)[]).map(
                (key) => (
                  <li key={key} className="flex items-start gap-3">
                    <input
                      id={`c-${key}`}
                      type="checkbox"
                      checked={compliance[key]}
                      onChange={(e) =>
                        setCompliance((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="mt-1 rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-red-500/40"
                    />
                    <label htmlFor={`c-${key}`} className="text-sm text-zinc-300">
                      {labels[key]}
                    </label>
                  </li>
                ),
              )}
            </ul>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              eCard / document upload (PDF or image, max ~4 MB)
            </span>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-red-950/50 file:px-4 file:py-2 file:text-sm file:text-red-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional audit notes…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
          </label>

          {submitError ? (
            <p className="text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-red-700/50 bg-red-950/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/70 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save audit record"}
          </button>
        </form>
      </section>
      ) : null}

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Audit history</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Saved audit submissions with compliance progress and optional files.
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
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Audited</th>
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
                        <button
                          type="button"
                          onClick={() => void removeRecord(r.id)}
                          className="text-xs text-zinc-500 hover:text-red-400"
                        >
                          Delete
                        </button>
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
