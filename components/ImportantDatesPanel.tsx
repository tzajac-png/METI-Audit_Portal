"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IMPORTANT_DATES_CATALOG,
  type ImportantDateRow,
  type ImportantDateSeverity,
} from "@/lib/important-dates-catalog";

const STORAGE_KEY = "meti-important-dates-v1";

type Persisted = {
  hiddenCatalogIds: string[];
  customRows: ImportantDateRow[];
};

function emptyPersisted(): Persisted {
  return { hiddenCatalogIds: [], customRows: [] };
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return emptyPersisted();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      hiddenCatalogIds: Array.isArray(p.hiddenCatalogIds)
        ? p.hiddenCatalogIds.filter((x) => typeof x === "string")
        : [],
      customRows: Array.isArray(p.customRows)
        ? p.customRows.filter(
            (r): r is ImportantDateRow =>
              r &&
              typeof r.id === "string" &&
              typeof r.alertType === "string",
          )
        : [],
    };
  } catch {
    return emptyPersisted();
  }
}

function savePersisted(p: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function severityClass(s: ImportantDateSeverity): string {
  switch (s) {
    case "Critical":
      return "bg-red-950/70 text-red-200 ring-1 ring-red-800/60";
    case "High":
      return "bg-amber-950/60 text-amber-200 ring-1 ring-amber-800/50";
    case "Medium":
      return "bg-yellow-950/40 text-yellow-100 ring-1 ring-yellow-800/40";
    case "Low":
      return "bg-zinc-800/80 text-zinc-300 ring-1 ring-zinc-600/50";
    default:
      return "bg-zinc-800 text-zinc-300";
  }
}

const SEVERITY_OPTIONS: ImportantDateSeverity[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

function newCustomId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ImportantDatesPanel() {
  const [hiddenCatalogIds, setHiddenCatalogIds] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<ImportantDateRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState("");
  const [openAdd, setOpenAdd] = useState(false);

  const [form, setForm] = useState({
    alertType: "",
    trigger: "",
    severity: "Medium" as ImportantDateSeverity,
    audience: "",
    message: "",
    actionRequired: "",
  });

  useEffect(() => {
    const p = loadPersisted();
    setHiddenCatalogIds(p.hiddenCatalogIds);
    setCustomRows(p.customRows);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted({ hiddenCatalogIds, customRows });
  }, [hydrated, hiddenCatalogIds, customRows]);

  const catalogVisible = useMemo(() => {
    const hide = new Set(hiddenCatalogIds);
    return IMPORTANT_DATES_CATALOG.filter((r) => !hide.has(r.id));
  }, [hiddenCatalogIds]);

  const rows = useMemo(() => {
    const merged = [...catalogVisible, ...customRows];
    const q = filter.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((r) => {
      const blob = [
        r.alertType,
        r.trigger,
        r.severity,
        r.audience,
        r.message,
        r.actionRequired,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [catalogVisible, customRows, filter]);

  function hideCatalogRow(id: string) {
    setHiddenCatalogIds((prev) => [...prev, id]);
  }

  function removeCustomRow(id: string) {
    setCustomRows((prev) => prev.filter((r) => r.id !== id));
  }

  function resetList() {
    if (
      !confirm(
        "Reset important dates? This restores all catalog rows and removes your custom entries.",
      )
    ) {
      return;
    }
    const empty = emptyPersisted();
    setHiddenCatalogIds(empty.hiddenCatalogIds);
    setCustomRows(empty.customRows);
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.alertType.trim()) return;
    const row: ImportantDateRow = {
      id: newCustomId(),
      alertType: form.alertType.trim(),
      trigger: form.trigger.trim(),
      severity: form.severity,
      audience: form.audience.trim(),
      message: form.message.trim(),
      actionRequired: form.actionRequired.trim(),
    };
    setCustomRows((prev) => [...prev, row]);
    setForm({
      alertType: "",
      trigger: "",
      severity: "Medium",
      audience: "",
      message: "",
      actionRequired: "",
    });
    setOpenAdd(false);
  }

  const isCatalogId = (id: string) => id.startsWith("cat-");

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-red-900/30 bg-[var(--surface)] p-4 shadow-lg shadow-black/20 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Important dates</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Each row lists alert type, trigger, severity, audience, message, and
            action required. Use <span className="text-zinc-400">Add important date</span>{" "}
            for custom entries. This list is saved in your browser on this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-950/70"
          >
            Add important date
          </button>
          <button
            type="button"
            onClick={resetList}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            Reset list
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-500">
          Filter
        </label>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search alert type, audience, message…"
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      {!hydrated ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          {/* Mobile: card list — avoids horizontal overflow / broken layout */}
          <div className="mt-4 space-y-3 md:hidden">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-zinc-800/80 py-8 text-center text-sm text-zinc-500">
                No rows match your filter.
              </p>
            ) : (
              rows.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4 text-sm"
                >
                  <dl className="space-y-2 text-zinc-400">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <dt className="text-xs font-medium text-zinc-500">
                          Alert Type
                        </dt>
                        <dd className="font-semibold text-white">{r.alertType}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-xs font-medium text-zinc-500">
                          Severity
                        </dt>
                        <dd className="mt-0.5">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${severityClass(r.severity)}`}
                          >
                            {r.severity}
                          </span>
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">
                        Trigger
                      </dt>
                      <dd className="text-zinc-300">{r.trigger || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">
                        Audience
                      </dt>
                      <dd className="text-zinc-300">{r.audience || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">
                        Message
                      </dt>
                      <dd>{r.message || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">
                        Action Required
                      </dt>
                      <dd>{r.actionRequired || "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 border-t border-zinc-800/80 pt-3">
                    {isCatalogId(r.id) ? (
                      <button
                        type="button"
                        onClick={() => hideCatalogRow(r.id)}
                        className="text-xs font-medium text-red-400/90 underline hover:text-red-300"
                      >
                        Remove from list
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeCustomRow(r.id)}
                        className="text-xs font-medium text-red-400/90 underline hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {/* md+: scrollable table with sticky header */}
          <div className="mt-4 hidden max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-zinc-800/80 md:block">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-[1]">
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 shadow-sm shadow-black/40">
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    Alert Type
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    Trigger
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    Severity
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    Audience
                  </th>
                  <th className="min-w-[12rem] px-3 py-2.5 font-semibold">
                    Message
                  </th>
                  <th className="min-w-[10rem] px-3 py-2.5 font-semibold">
                    Action Required
                  </th>
                  <th className="w-24 whitespace-nowrap px-3 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-zinc-500"
                    >
                      No rows match your filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="text-zinc-300">
                      <td className="px-3 py-2.5 align-top font-medium text-white">
                        {r.alertType}
                      </td>
                      <td className="px-3 py-2.5 align-top text-zinc-400">
                        {r.trigger}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${severityClass(r.severity)}`}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">{r.audience}</td>
                      <td className="px-3 py-2.5 align-top text-zinc-400">
                        {r.message}
                      </td>
                      <td className="px-3 py-2.5 align-top text-zinc-400">
                        {r.actionRequired}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {isCatalogId(r.id) ? (
                          <button
                            type="button"
                            onClick={() => hideCatalogRow(r.id)}
                            className="text-xs text-red-400/90 underline hover:text-red-300"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeCustomRow(r.id)}
                            className="text-xs text-red-400/90 underline hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-zinc-600">
        Showing {rows.length} row{rows.length === 1 ? "" : "s"}
        {filter.trim() ? " (filtered)" : ""}.
      </p>

      {openAdd ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="important-date-dialog-title"
          onClick={() => setOpenAdd(false)}
        >
          <div
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-red-900/40 bg-zinc-950 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="important-date-dialog-title"
              className="text-lg font-semibold text-white"
            >
              Add important date
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              All fields except alert type can be left blank if needed.
            </p>
            <form onSubmit={submitAdd} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-red-400/90">
                  Alert Type *
                </span>
                <input
                  required
                  value={form.alertType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alertType: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Trigger</span>
                <input
                  value={form.trigger}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trigger: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Severity</span>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      severity: e.target.value as ImportantDateSeverity,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Audience</span>
                <input
                  value={form.audience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audience: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Message</span>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Action required</span>
                <textarea
                  value={form.actionRequired}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, actionRequired: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-white hover:bg-red-950/70"
                >
                  Save row
                </button>
                <button
                  type="button"
                  onClick={() => setOpenAdd(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
