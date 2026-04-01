"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DirectoryListItem = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
};

type Props = {
  items: DirectoryListItem[];
};

export function StudentDirectoryTable({ items }: Props) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay =
        `${row.first} ${row.last} ${row.email} ${row.phone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input);
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="dir-search"
            className="text-xs font-medium text-zinc-500"
          >
            Search by first name, last name, email, or phone
          </label>
          <input
            id="dir-search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-900/50 focus:outline-none focus:ring-1 focus:ring-red-900/40"
            placeholder="Type a name, email, or phone…"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-red-800/60 bg-red-950/50 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-950/80"
        >
          Search
        </button>
        {query ? (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900/60"
            onClick={() => {
              setInput("");
              setQuery("");
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      <p className="text-xs text-zinc-500">
        Showing {filtered.length} of {items.length} students
        {query ? ` matching “${query}”` : ""}.
      </p>

      <div className="overflow-hidden rounded-xl border border-red-900/30 bg-[var(--surface)]">
        <div className="max-h-[min(75vh,880px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-red-900/35">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  First name
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Last name
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Email
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Phone
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    No students match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 text-zinc-100">
                      {row.first || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-100">
                      {row.last || "—"}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 font-mono text-xs text-zinc-300">
                      {row.email || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                      {row.phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/courses/student-directory/${encodeURIComponent(row.id)}`}
                        className="font-medium text-red-400 hover:text-red-300"
                      >
                        View
                      </Link>
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
