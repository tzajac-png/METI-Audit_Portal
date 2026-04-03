"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InstructorCourseSummary } from "@/lib/instructor-courses";
import type { AuditRecord } from "@/lib/audit-records-store";
import type { ComplianceChecklist } from "@/lib/audit-constants";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
} from "@/lib/audit-constants";
import { readApiErrorMessage } from "@/lib/read-api-error";

type ApiGet = {
  records: AuditRecord[];
  complianceLabels: typeof COMPLIANCE_FIELD_LABELS;
};

type Props = {
  courses: InstructorCourseSummary[];
  /** When set, load this record and run in edit mode */
  editRecordId?: string;
  /** Prefill course dropdown + snapshot fields (e.g. from `/audit/courses/new?courseCode=…`) */
  initialCourseCode?: string;
};

export function AuditRecordForm({
  courses,
  editRecordId,
  initialCourseCode,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editRecordId);

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

  const appliedInitialCourse = useRef(false);

  const [labels, setLabels] =
    useState<typeof COMPLIANCE_FIELD_LABELS>(COMPLIANCE_FIELD_LABELS);

  const applyCourseSelection = useCallback(
    (code: string) => {
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
    },
    [courses],
  );

  useEffect(() => {
    if (!editRecordId) return;

    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/audit-records", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(
              await readApiErrorMessage(res, "Could not load audit records."),
            );
          }
          return;
        }
        const json = (await res.json()) as ApiGet;
        if (cancelled) return;
        setLabels(json.complianceLabels ?? COMPLIANCE_FIELD_LABELS);
        const r = json.records.find((x) => x.id === editRecordId);
        if (!r) {
          setLoadError("That audit record was not found.");
          return;
        }
        setCourseCode(r.courseCode);
        setCourseDateLabel(r.courseDateLabel === "—" ? "" : r.courseDateLabel);
        setCourseLocation(r.courseLocation === "—" ? "" : r.courseLocation);
        setLeadInstructor(r.leadInstructor === "—" ? "" : r.leadInstructor);
        setAuditorName(r.auditorName);
        setNotes(r.notes);
        setCompliance({ ...r.compliance });
        setFile(null);
      } catch {
        if (!cancelled) setLoadError("Could not load audit records.");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editRecordId]);

  useEffect(() => {
    if (editRecordId || appliedInitialCourse.current) return;
    const code = initialCourseCode?.trim();
    if (!code) return;
    if (!courses.some((c) => c.courseCode === code)) return;
    applyCourseSelection(code);
    appliedInitialCourse.current = true;
  }, [courses, initialCourseCode, editRecordId, applyCourseSelection]);

  useEffect(() => {
    if (editRecordId) return;
    (async () => {
      try {
        const res = await fetch("/api/audit-records", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as ApiGet;
        if (json.complianceLabels) setLabels(json.complianceLabels);
      } catch {
        /* optional */
      }
    })();
  }, [editRecordId]);

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
      if (editRecordId) fd.set("recordId", editRecordId);

      const res = await fetch("/api/audit-records", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        setSubmitError(await readApiErrorMessage(res, "Save failed."));
        return;
      }
      router.push("/audit/courses");
      router.refresh();
    } catch {
      setSubmitError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (editRecordId && loadingEdit) {
    return (
      <p className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-8 text-zinc-400">
        Loading audit record…
      </p>
    );
  }

  if (editRecordId && loadError) {
    return (
      <div className="space-y-4 rounded-xl border border-red-900/30 bg-[var(--surface)] p-8">
        <p className="text-red-400">{loadError}</p>
        <Link
          href="/audit/courses"
          className="inline-block text-sm text-red-400/90 underline hover:text-red-300"
        >
          ← Back to course audits
        </Link>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {editRecordId ? "Edit audit record" : "Record a course audit"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Choose the class, auditor, compliance checklist, optional eCard / document
            upload, and notes. Only Tyler Zajac or Ben Bonathan may be selected as
            auditor.
            {editRecordId
              ? " Upload a new file only if you want to replace the existing attachment."
              : null}
          </p>
        </div>
        <Link
          href="/audit/courses"
          className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-white"
        >
          ← Back to audits
        </Link>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
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
                    id={`audit-form-c-${key}`}
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
                  <label htmlFor={`audit-form-c-${key}`} className="text-sm text-zinc-300">
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-red-700/50 bg-red-950/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/70 disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : editRecordId
                ? "Save changes"
                : "Save audit record"}
          </button>
          <Link
            href="/audit/courses"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
