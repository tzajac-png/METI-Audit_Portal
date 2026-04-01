"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  extractGoogleDriveFileId,
  instructorPhotoUrlCandidates,
} from "@/lib/instructor-photo";

export type InstructorListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Raw Photo cell from the sheet (often a Google Drive link) */
  photoCell: string | null;
};

type Props = {
  items: InstructorListItem[];
};

function buildPhotoCandidates(photoCell: string | null): string[] {
  if (!photoCell) return [];
  const id = extractGoogleDriveFileId(photoCell);
  const list = id
    ? [
        `/api/instructor-drive-thumb?id=${encodeURIComponent(id)}`,
        ...instructorPhotoUrlCandidates(photoCell),
      ]
    : instructorPhotoUrlCandidates(photoCell);
  const seen = new Set<string>();
  return list.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

function InitialsAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl font-semibold text-zinc-400">
      {initials}
    </div>
  );
}

function TilePhoto({
  name,
  photoCell,
}: {
  name: string;
  photoCell: string | null;
}) {
  const candidates = useMemo(
    () => buildPhotoCandidates(photoCell),
    [photoCell],
  );
  const [index, setIndex] = useState(0);
  const [giveUp, setGiveUp] = useState(false);

  if (candidates.length === 0 || giveUp || index >= candidates.length) {
    return <InitialsAvatar name={name} />;
  }

  const src = candidates[index]!;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Drive + same-origin proxy URLs
    <img
      key={src}
      src={src}
      alt=""
      className="h-28 w-28 shrink-0 rounded-xl border border-zinc-700 object-cover"
      loading="lazy"
      onError={() => {
        if (index + 1 < candidates.length) {
          setIndex((i) => i + 1);
        } else {
          setGiveUp(true);
        }
      }}
    />
  );
}

export function InstructorDirectoryTiles({ items }: Props) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = `${row.name} ${row.email} ${row.phone}`.toLowerCase();
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
            htmlFor="instr-search"
            className="text-xs font-medium text-zinc-500"
          >
            Search by name, email, or phone
          </label>
          <input
            id="instr-search"
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
        <button
          type="button"
          onClick={() => {
            setInput("");
            setQuery("");
          }}
          className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80"
        >
          Clear
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={`/courses/instructor-directory/${encodeURIComponent(row.id)}`}
            className="group flex gap-4 rounded-xl border border-red-900/30 bg-[var(--surface)] p-4 shadow-lg shadow-black/20 transition hover:border-red-500/40 hover:bg-zinc-900/50"
          >
            <TilePhoto name={row.name} photoCell={row.photoCell} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white group-hover:text-red-100">
                {row.name || "—"}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {row.email || "—"}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-600">
                {row.phone || "—"}
              </p>
              <p className="mt-3 text-xs font-medium text-red-400 group-hover:text-red-300">
                Open profile →
              </p>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 py-12 text-center text-sm text-zinc-500">
          No instructors match your search.
        </p>
      ) : null}
    </div>
  );
}
