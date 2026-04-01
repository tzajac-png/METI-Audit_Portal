"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseRow } from "@/lib/sheet";
import { COURSE_TYPES } from "@/lib/course";
import { pickDisplayColumns } from "@/lib/display-columns";

const STORAGE_KEY = "meti_audit_v1";

type RowAudit = { status: string; notes: string; updatedAt: string };
type AuditState = Record<string, RowAudit>;

type Props = {
  rows: CourseRow[];
  headers: string[];
  fetchedAt: string;
};

export function AuditWorkspace({ rows, headers, fetchedAt }: Props) {
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [audit, setAudit] = useState<AuditState>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAudit(JSON.parse(raw) as AuditState);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: AuditState) => {
    setAudit(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const displayCols = useMemo(() => pickDisplayColumns(headers), [headers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "All") {
        if (filter === "Other") {
          if (r._courseType !== "Other") return false;
        } else if (r._courseType !== filter) {
          return false;
        }
      }
      if (!q) return true;
      return displayCols.some((col) =>
        (r[col] ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, filter, query, displayCols]);

  const updateRow = (id: string, patch: Partial<RowAudit>) => {
    const prev = audit[id] ?? {
      status: "pending",
      notes: "",
      updatedAt: new Date().toISOString(),
    };
    const next = {
      ...audit,
      [id]: {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    };
    persist(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Course audit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Review submissions and record outcomes. Notes and status are stored
            in this browser until you export or connect a database. Last data
            fetch:{" "}
            <span className="font-mono text-zinc-300">
              {new Date(fetchedAt).toLocaleString()}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const header = [
                "rowId",
                "courseType",
                ...displayCols.slice(0, 10),
                "audit_status",
                "audit_notes",
                "audit_updated",
              ];
              const lines = filtered.map((r) => {
                const a = audit[r._rowId];
                return [
                  r._rowId,
                  r._courseType,
                  ...displayCols.slice(0, 10).map((c) => r[c] ?? ""),
                  a?.status ?? "",
                  (a?.notes ?? "").replace(/\r?\n/g, " "),
                  a?.updatedAt ?? "",
                ]
                  .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                  .join(",");
              });
              const blob = new Blob([[header.join(","), ...lines].join("\n")], {
                type: "text/csv;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `meti-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-950/70"
          >
            Export CSV (filtered)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...COURSE_TYPES, "Other"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              filter === key
                ? "border-red-500 bg-red-950/50 text-white"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-red-900/60"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <label className="block max-w-md">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
          Search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter rows…"
          className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
        />
      </label>

      <div className="overflow-hidden rounded-xl border border-red-900/30 bg-[var(--surface)]">
        <div className="max-h-[min(75vh,960px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-red-900/35">
                <th className="whitespace-nowrap px-2 py-3 font-semibold text-red-400">
                  Type
                </th>
                {displayCols.slice(0, 8).map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-2 py-3 font-semibold text-zinc-200"
                  >
                    {col}
                  </th>
                ))}
                <th className="whitespace-nowrap px-2 py-3 font-semibold text-red-300">
                  Audit status
                </th>
                <th className="min-w-[12rem] px-2 py-3 font-semibold text-red-300">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filtered.map((row) => {
                const id = row._rowId;
                const a = audit[id];
                return (
                  <tr key={id} className="align-top hover:bg-zinc-900/40">
                    <td className="whitespace-nowrap px-2 py-2 text-red-300">
                      {row._courseType}
                    </td>
                    {displayCols.slice(0, 8).map((col) => (
                      <td
                        key={col}
                        className="max-w-[10rem] truncate px-2 py-2 text-zinc-300"
                        title={row[col]}
                      >
                        {row[col] || "—"}
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <select
                        value={a?.status ?? "pending"}
                        onChange={(e) =>
                          updateRow(id, { status: e.target.value })
                        }
                        className="w-full min-w-[8rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="issues">Issues found</option>
                        <option value="cleared">Cleared</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <textarea
                        value={a?.notes ?? ""}
                        onChange={(e) => updateRow(id, { notes: e.target.value })}
                        rows={2}
                        placeholder="Audit notes…"
                        className="w-full min-w-[12rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
