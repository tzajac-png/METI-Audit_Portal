"use client";

import { useMemo, useState } from "react";
import type { CourseRow } from "@/lib/sheet";
import { COURSE_TYPES, type CourseType } from "@/lib/course";
import { pickDisplayColumns } from "@/lib/display-columns";

type Filter = "All" | CourseType | "Other";

type Props = {
  rows: CourseRow[];
  headers: string[];
  fetchedAt: string;
};

export function CourseExplorer({ rows, headers, fetchedAt }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const t of COURSE_TYPES) c[t] = 0;
    c.Other = 0;
    for (const r of rows) {
      const k = r._courseType === "Other" ? "Other" : r._courseType;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Course records</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Data synced from the Student Sign Up spreadsheet. Last fetch:{" "}
            <span className="font-mono text-zinc-300">
              {new Date(fetchedAt).toLocaleString()}
            </span>
          </p>
        </div>
        <label className="block max-w-md flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, course code…"
            className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "All",
            ...COURSE_TYPES,
            "Other",
          ] as const
        ).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              filter === key
                ? "border-red-500 bg-red-950/50 text-white"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-red-900/60 hover:text-white"
            }`}
          >
            {key}
            <span className="ml-1.5 text-xs text-zinc-500">
              {counts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-red-900/30 bg-[var(--surface)] shadow-xl shadow-black/40">
        <div className="max-h-[min(70vh,900px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-red-900/35">
                <th className="whitespace-nowrap px-3 py-3 font-semibold text-red-400">
                  Type
                </th>
                {displayCols.slice(0, 12).map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-200"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayCols.length + 1}
                    className="px-3 py-10 text-center text-zinc-500"
                  >
                    No rows match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row._rowId}
                    className="hover:bg-zinc-900/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-red-300">
                      {row._courseType}
                    </td>
                    {displayCols.slice(0, 12).map((col) => (
                      <td
                        key={col}
                        className="max-w-[14rem] truncate px-3 py-2.5 text-zinc-300"
                        title={row[col]}
                      >
                        {row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-red-900/25 px-4 py-2 text-xs text-zinc-500">
          Showing {filtered.length} of {rows.length} rows
          {filter !== "All" ? ` (${filter})` : ""}
        </p>
      </div>
    </div>
  );
}
