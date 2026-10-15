"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMS_CE_STATE_STATUSES,
  EMS_CE_STATE_STATUS_LABELS,
  type EmsCeStateStatus,
  type EmsCeStateSubmission,
} from "@/lib/ems-ce-types";

const emptyForm = {
  courseTitle: "",
  courseDate: "",
  hours: "",
  instructor: "",
  submittedToStateAt: "",
  status: "draft" as EmsCeStateStatus,
  confirmationNumber: "",
  notes: "",
};

function statusBadge(status: EmsCeStateStatus) {
  const label = EMS_CE_STATE_STATUS_LABELS[status];
  const tone =
    status === "approved"
      ? "bg-emerald-950/60 text-emerald-300"
      : status === "denied"
        ? "bg-red-950/60 text-red-300"
        : status === "submitted" || status === "resubmitted" || status === "under_review"
          ? "bg-amber-950/50 text-amber-200"
          : "bg-zinc-800 text-zinc-300";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function EmsCeStateSubmissionsPanel() {
  const [items, setItems] = useState<EmsCeStateSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ems-ce/submissions", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setItems(data.submissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: EmsCeStateSubmission) {
    setEditingId(item.id);
    setForm({
      courseTitle: item.courseTitle,
      courseDate: item.courseDate,
      hours: item.hours,
      instructor: item.instructor,
      submittedToStateAt: item.submittedToStateAt,
      status: item.status,
      confirmationNumber: item.confirmationNumber,
      notes: item.notes,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ems-ce/submissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this state submission record?")) return;
    setError(null);
    const res = await fetch(`/api/ems-ce/submissions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Delete failed");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          CEs submitted to the state
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Log each CE package sent for state approval and track its current
          status.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-[var(--surface)] p-4"
      >
        <p className="text-sm font-medium text-zinc-200">
          {editingId ? "Edit submission" : "Add submission"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            Course title
            <input
              className={`mt-1 ${field}`}
              value={form.courseTitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, courseTitle: e.target.value }))
              }
              required
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Course date
            <input
              type="date"
              className={`mt-1 ${field}`}
              value={form.courseDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, courseDate: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500">
            CE hours
            <input
              className={`mt-1 ${field}`}
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              placeholder="e.g. 2.0"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Instructor / submitter
            <input
              className={`mt-1 ${field}`}
              value={form.instructor}
              onChange={(e) =>
                setForm((f) => ({ ...f, instructor: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Submitted to state
            <input
              type="date"
              className={`mt-1 ${field}`}
              value={form.submittedToStateAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, submittedToStateAt: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Status
            <select
              className={`mt-1 ${field}`}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as EmsCeStateStatus,
                }))
              }
            >
              {EMS_CE_STATE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMS_CE_STATE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Confirmation / tracking number
            <input
              className={`mt-1 ${field}`}
              value={form.confirmationNumber}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  confirmationNumber: e.target.value,
                }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Notes
            <textarea
              className={`mt-1 min-h-[4.5rem] ${field}`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Update" : "Add record"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[var(--surface)]">
        <div className="max-h-[min(70vh,820px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 font-semibold text-red-400">Course</th>
                <th className="px-4 py-3 font-semibold text-red-400">Date</th>
                <th className="px-4 py-3 font-semibold text-red-400">Hours</th>
                <th className="px-4 py-3 font-semibold text-red-400">Status</th>
                <th className="px-4 py-3 font-semibold text-red-400">
                  Confirmation
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    No state submissions yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 text-zinc-100">
                      <div>{item.courseTitle}</div>
                      {item.instructor ? (
                        <div className="text-xs text-zinc-500">
                          {item.instructor}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                      {item.courseDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.hours || "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {item.confirmationNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="mr-3 text-red-400 hover:text-red-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(item.id)}
                        className="text-zinc-500 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
