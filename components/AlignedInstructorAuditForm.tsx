"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AlignedInstructorAuditRecord } from "@/lib/aligned-instructor-audit-store";
import type { AlignedInstructorRowSummary } from "@/lib/aligned-instructor-row-summaries";
import type { ComplianceChecklist } from "@/lib/audit-constants";
import {
  AUDITOR_OPTIONS,
  COMPLIANCE_FIELD_LABELS,
  emptyCompliance,
} from "@/lib/audit-constants";
import { readApiErrorMessage } from "@/lib/read-api-error";
import { stripAlignedBoilerplateFromSnapshot } from "@/lib/aligned-instructor-snapshot-filter";
import {
  ALIGNED_PORTAL_SUBMISSION_LABELS,
  type AlignedPortalSubmissionStatus,
} from "@/lib/aligned-instructor-submission-types";

const STATUS_OPTIONS: AlignedPortalSubmissionStatus[] = [
  "reviewed",
  "payment_collected_submitted_cards",
  "holding_class_payment",
  "cards_issued",
];

type ApiSubmissions = {
  entries: { rowKey: string; status: AlignedPortalSubmissionStatus }[];
};

type ApiGet = {
  records: AlignedInstructorAuditRecord[];
  complianceLabels: typeof COMPLIANCE_FIELD_LABELS;
};

type Props = {
  rosterRows: AlignedInstructorRowSummary[];
  editRecordId?: string;
  initialRowKey?: string;
};

const SNAPSHOT_DL_MAX = 24;

export function AlignedInstructorAuditForm({
  rosterRows,
  editRecordId,
  initialRowKey,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editRecordId);

  const [rowKey, setRowKey] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [rowSnapshot, setRowSnapshot] = useState<Record<string, string>>({});
  const [auditorName, setAuditorName] = useState<
    (typeof AUDITOR_OPTIONS)[number]
  >(AUDITOR_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [compliance, setCompliance] = useState<ComplianceChecklist>(
    emptyCompliance(),
  );

  const appliedInitialRow = useRef(false);
  const [labels, setLabels] =
    useState<typeof COMPLIANCE_FIELD_LABELS>(COMPLIANCE_FIELD_LABELS);
  const [submissionStatus, setSubmissionStatus] =
    useState<AlignedPortalSubmissionStatus>("reviewed");

  const applyRowSelection = useCallback(
    (key: string) => {
      setRowKey(key);
      const row = rosterRows.find((x) => x.rowKey === key);
      if (row) {
        setDisplayLabel(row.displayLabel);
        setRowSnapshot(stripAlignedBoilerplateFromSnapshot({ ...row.snapshot }));
      } else {
        setDisplayLabel("");
        setRowSnapshot({});
      }
    },
    [rosterRows],
  );

  useEffect(() => {
    if (!editRecordId) return;

    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/aligned-instructor-audits", {
          credentials: "include",
        });
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
        setRowKey(r.rowKey);
        setDisplayLabel(r.displayLabel === "—" ? "" : r.displayLabel);
        setRowSnapshot(stripAlignedBoilerplateFromSnapshot({ ...r.rowSnapshot }));
        setAuditorName(r.auditorName);
        setNotes(r.notes);
        setCompliance({ ...r.compliance });
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
    if (editRecordId || appliedInitialRow.current) return;
    const key = initialRowKey?.trim();
    if (!key) return;
    if (!rosterRows.some((r) => r.rowKey === key)) return;
    applyRowSelection(key);
    appliedInitialRow.current = true;
  }, [rosterRows, initialRowKey, editRecordId, applyRowSelection]);

  useEffect(() => {
    if (editRecordId) return;
    (async () => {
      try {
        const res = await fetch("/api/aligned-instructor-audits", {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as ApiGet;
        if (json.complianceLabels) setLabels(json.complianceLabels);
      } catch {
        /* optional */
      }
    })();
  }, [editRecordId]);

  /** Open row (new submission → tracked) and load current submission status. */
  useEffect(() => {
    const k = rowKey.trim();
    if (!k) return;
    let cancelled = false;
    void (async () => {
      await fetch("/api/aligned-instructor-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowKey: k, action: "open" }),
        credentials: "include",
      }).catch(() => {});
      const res = await fetch("/api/aligned-instructor-submission", {
        credentials: "include",
      });
      if (!res.ok || cancelled) return;
      const { entries } = (await res.json()) as ApiSubmissions;
      const e = entries.find((x) => x.rowKey === k);
      if (cancelled) return;
      if (e) setSubmissionStatus(e.status);
      else setSubmissionStatus("reviewed");
    })();
    return () => {
      cancelled = true;
    };
  }, [rowKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rowKey.trim()) {
      setSubmitError("Select a roster row.");
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("rowKey", rowKey.trim());
      fd.set("displayLabel", displayLabel.trim() || "—");
      fd.set("rowSnapshotJson", JSON.stringify(rowSnapshot));
      fd.set("auditorName", auditorName);
      fd.set("notes", notes);
      (Object.keys(compliance) as (keyof ComplianceChecklist)[]).forEach((k) => {
        fd.set(`compliance_${k}`, compliance[k] ? "true" : "false");
      });
      if (editRecordId) fd.set("recordId", editRecordId);

      const res = await fetch("/api/aligned-instructor-audits", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        setSubmitError(await readApiErrorMessage(res, "Save failed."));
        return;
      }
      router.push("/aligned-instructors-admin");
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
          href="/aligned-instructors-admin"
          className="inline-block text-sm text-red-400/90 underline hover:text-red-300"
        >
          ← Back to aligned instructors admin
        </Link>
      </div>
    );
  }

  const snapshotEntries = Object.entries(rowSnapshot)
    .filter(([, v]) => v.trim())
    .slice(0, SNAPSHOT_DL_MAX);

  return (
    <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {editRecordId
              ? "Edit aligned instructor audit"
              : "Record an aligned instructor audit"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Same compliance checklist as course audit. Auditors: Tyler Zajac or
            Ben Bonathan only. Set submission status here (read-only on the main
            list). Row data is snapshotted when you save.
          </p>
        </div>
        <Link
          href="/aligned-instructors-admin"
          className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-white"
        >
          ← Back
        </Link>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        {!editRecordId ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
              Roster row
            </span>
            <select
              required
              value={rowKey}
              onChange={(e) => applyRowSelection(e.target.value)}
              className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
            >
              <option value="">Select a row…</option>
              {rosterRows.map((r) => (
                <option key={r.rowKey} value={r.rowKey}>
                  {r.displayLabel}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
            <p className="text-xs font-medium text-zinc-500">Row</p>
            <p className="mt-0.5 text-sm text-white">
              {displayLabel || "—"}{" "}
              <span className="font-mono text-xs text-zinc-500">({rowKey})</span>
            </p>
          </div>
        )}

        {rowKey ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
              Submission status
            </span>
            <select
              value={submissionStatus}
              onChange={(e) => {
                const v = e.target.value as AlignedPortalSubmissionStatus;
                setSubmissionStatus(v);
                void fetch("/api/aligned-instructor-submission", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    rowKey: rowKey.trim(),
                    action: "set_status",
                    status: v,
                  }),
                  credentials: "include",
                }).catch(() => {});
              }}
              className="w-full max-w-lg rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500/60 focus:outline-none"
            >
              {STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {ALIGNED_PORTAL_SUBMISSION_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {snapshotEntries.length > 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sheet snapshot
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {snapshotEntries.map(([k, v]) => (
                <div key={k} className="border-b border-zinc-800/80 pb-2 sm:border-b-0">
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="mt-0.5 break-words text-sm text-zinc-200">
                    {/^https?:\/\//i.test(v) ? (
                      <a
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400/90 underline hover:text-red-300"
                      >
                        Link
                      </a>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : rowKey ? (
          <p className="text-sm text-zinc-500">No cell values in snapshot.</p>
        ) : null}

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

        <fieldset className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
          <legend className="px-1 text-sm font-medium text-white">
            Compliance checklist
          </legend>
          <ul className="mt-3 space-y-2">
            {(Object.keys(emptyCompliance()) as (keyof ComplianceChecklist)[]).map(
              (key) => (
                <li key={key} className="flex items-start gap-3">
                  <input
                    id={`aligned-audit-c-${key}`}
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
                  <label
                    htmlFor={`aligned-audit-c-${key}`}
                    className="text-sm text-zinc-300"
                  >
                    {labels[key]}
                  </label>
                </li>
              ),
            )}
          </ul>
        </fieldset>

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
            href="/aligned-instructors-admin"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
