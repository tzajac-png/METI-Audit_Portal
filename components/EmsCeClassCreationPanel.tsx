"use client";

import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import {
  EMS_CE_CLASS_STATUSES,
  EMS_CE_CLASS_STATUS_LABELS,
  type EmsCeClass,
  type EmsCeClassStatus,
} from "@/lib/ems-ce-types";

const emptyForm = {
  title: "",
  courseDate: "",
  location: "",
  instructor: "",
  hours: "",
  status: "planning" as EmsCeClassStatus,
  notes: "",
};

function downloadClassPaperworkPdf(cls: EmsCeClass) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 48;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("METI — EMS CE Class Paperwork Summary", left, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Class title", cls.title || "—"],
    ["Course date", cls.courseDate || "—"],
    ["Location", cls.location || "—"],
    ["Instructor", cls.instructor || "—"],
    ["CE hours", cls.hours || "—"],
    ["Status", EMS_CE_CLASS_STATUS_LABELS[cls.status]],
    ["Notes", cls.notes || "—"],
    ["Generated", new Date().toLocaleString()],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, left, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 460);
    doc.text(lines, left + 110, y);
    y += Math.max(18, lines.length * 14);
  }

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Uploaded tracking documents", left, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  if (cls.paperwork.length === 0) {
    doc.text("None uploaded yet.", left, y);
  } else {
    for (const f of cls.paperwork) {
      const line = `• ${f.label ? `${f.label}: ` : ""}${f.originalName}`;
      const lines = doc.splitTextToSize(line, 500);
      doc.text(lines, left, y);
      y += lines.length * 14;
      if (y > 720) {
        doc.addPage();
        y = 56;
      }
    }
  }

  const safe = cls.title.replace(/[^\w.-]+/g, "_").slice(0, 40) || "class";
  doc.save(`EMS-CE-${safe}-paperwork.pdf`);
}

export function EmsCeClassCreationPanel() {
  const [items, setItems] = useState<EmsCeClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadClassId, setUploadClassId] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ems-ce/classes", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setItems(data.classes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: EmsCeClass) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      courseDate: item.courseDate,
      location: item.location,
      instructor: item.instructor,
      hours: item.hours,
      status: item.status,
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
      const res = await fetch("/api/ems-ce/classes", {
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
    if (!confirm("Delete this class and its uploaded paperwork?")) return;
    setError(null);
    const res = await fetch(`/api/ems-ce/classes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Delete failed");
      return;
    }
    if (editingId === id) resetForm();
    if (uploadClassId === id) {
      setUploadClassId(null);
      setUploadFile(null);
      setUploadLabel("");
    }
    await load();
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadClassId || !uploadFile) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("classId", uploadClassId);
      body.set("label", uploadLabel);
      body.set("file", uploadFile);
      const res = await fetch("/api/ems-ce/classes/paperwork", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed",
        );
      }
      setUploadFile(null);
      setUploadLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onRemovePaperwork(classId: string, fileId: string) {
    if (!confirm("Remove this uploaded document?")) return;
    setError(null);
    const res = await fetch(
      `/api/ems-ce/classes/paperwork?classId=${encodeURIComponent(classId)}&fileId=${encodeURIComponent(fileId)}`,
      { method: "DELETE", credentials: "include" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Remove failed");
      return;
    }
    await load();
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Class Creation</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Create CE classes, generate a paperwork summary PDF, and upload
          documents for course tracking.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-[var(--surface)] p-4"
      >
        <p className="text-sm font-medium text-zinc-200">
          {editingId ? "Edit class" : "Create class"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Class title
            <input
              className={`mt-1 ${field}`}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
            Location
            <input
              className={`mt-1 ${field}`}
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Instructor
            <input
              className={`mt-1 ${field}`}
              value={form.instructor}
              onChange={(e) =>
                setForm((f) => ({ ...f, instructor: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs text-zinc-500">
            CE hours
            <input
              className={`mt-1 ${field}`}
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
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
                  status: e.target.value as EmsCeClassStatus,
                }))
              }
            >
              {EMS_CE_CLASS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMS_CE_CLASS_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Notes
            <textarea
              className={`mt-1 min-h-[4rem] ${field}`}
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
            {saving ? "Saving…" : editingId ? "Update class" : "Create class"}
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

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            No CE classes created yet.
          </p>
        ) : (
          items.map((cls) => (
            <div
              key={cls.id}
              className="rounded-xl border border-zinc-800 bg-[var(--surface)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {cls.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {[cls.courseDate || null, cls.location || null, cls.instructor || null]
                      .filter(Boolean)
                      .join(" · ") || "Details not set"}
                    {cls.hours ? ` · ${cls.hours} CE hours` : ""}
                  </p>
                  <p className="mt-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                      {EMS_CE_CLASS_STATUS_LABELS[cls.status]}
                    </span>
                  </p>
                  {cls.notes ? (
                    <p className="mt-2 text-sm text-zinc-500">{cls.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadClassPaperworkPdf(cls)}
                    className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-950/70"
                  >
                    Generate paperwork PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadClassId(cls.id);
                      setUploadLabel("");
                      setUploadFile(null);
                    }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
                  >
                    Upload paperwork
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(cls)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(cls.id)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {cls.paperwork.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
                  {cls.paperwork.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <a
                        href={`/api/ems-ce/classes/paperwork/download?classId=${encodeURIComponent(cls.id)}&fileId=${encodeURIComponent(f.id)}`}
                        className="text-red-400 hover:text-red-300"
                      >
                        {f.label ? `${f.label}: ` : ""}
                        {f.originalName}
                      </a>
                      <button
                        type="button"
                        onClick={() => void onRemovePaperwork(cls.id, f.id)}
                        className="text-xs text-zinc-500 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                  No tracking documents uploaded yet.
                </p>
              )}

              {uploadClassId === cls.id ? (
                <form
                  onSubmit={onUpload}
                  className="mt-4 space-y-3 rounded-lg border border-zinc-700 bg-black/40 p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-red-400/90">
                    Upload for course tracking
                  </p>
                  <label className="block text-xs text-zinc-500">
                    Document label (optional)
                    <input
                      className={`mt-1 ${field}`}
                      value={uploadLabel}
                      onChange={(e) => setUploadLabel(e.target.value)}
                      placeholder="Roster, Sign-in sheet, Agenda…"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    File
                    <input
                      type="file"
                      required
                      className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-950/60 file:px-3 file:py-1.5 file:text-sm file:text-red-100"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={uploading || !uploadFile}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {uploading ? "Uploading…" : "Upload"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadClassId(null);
                        setUploadFile(null);
                        setUploadLabel("");
                      }}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
