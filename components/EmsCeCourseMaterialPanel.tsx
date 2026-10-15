"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmsCeMaterial } from "@/lib/ems-ce-types";

const emptyForm = {
  title: "",
  category: "General",
  notes: "",
};

export function EmsCeCourseMaterialPanel() {
  const [items, setItems] = useState<EmsCeMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ems-ce/materials", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setItems(data.materials ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: EmsCeMaterial) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      notes: item.notes,
    });
    setFile(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = new FormData();
      if (editingId) body.set("id", editingId);
      body.set("title", form.title);
      body.set("category", form.category);
      body.set("notes", form.notes);
      if (file) body.set("file", file);

      const res = await fetch("/api/ems-ce/materials", {
        method: "POST",
        credentials: "include",
        body,
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
    if (!confirm("Delete this course material?")) return;
    setError(null);
    const res = await fetch(`/api/ems-ce/materials?id=${encodeURIComponent(id)}`, {
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
        <h2 className="text-xl font-semibold text-white">CE Course Material</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Store lesson plans, outlines, handouts, and other CE course materials
          for reuse.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-[var(--surface)] p-4"
      >
        <p className="text-sm font-medium text-zinc-200">
          {editingId ? "Edit material" : "Add material"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            Title
            <input
              className={`mt-1 ${field}`}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Category
            <input
              className={`mt-1 ${field}`}
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Lesson plan, Handout, Outline…"
            />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Notes
            <textarea
              className={`mt-1 min-h-[4rem] ${field}`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            File {editingId ? "(optional — leave blank to keep current)" : ""}
            <input
              type="file"
              className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-950/60 file:px-3 file:py-1.5 file:text-sm file:text-red-100"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Update" : "Add material"}
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
                <th className="px-4 py-3 font-semibold text-red-400">Title</th>
                <th className="px-4 py-3 font-semibold text-red-400">Category</th>
                <th className="px-4 py-3 font-semibold text-red-400">File</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                    No course materials yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 text-zinc-100">
                      <div>{item.title}</div>
                      {item.notes ? (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {item.notes}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{item.category}</td>
                    <td className="px-4 py-3">
                      {item.file ? (
                        <a
                          href={`/api/ems-ce/materials/download?id=${encodeURIComponent(item.id)}`}
                          className="text-red-400 hover:text-red-300"
                        >
                          {item.file.originalName}
                        </a>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
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
