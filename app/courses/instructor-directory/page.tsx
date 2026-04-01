import Link from "next/link";
import {
  InstructorDirectoryTiles,
  type InstructorListItem,
} from "@/components/InstructorDirectoryTiles";
import {
  encodeInstructorId,
  pickInstructorEmail,
  pickInstructorName,
  pickInstructorPhone,
} from "@/lib/instructor-id";
import { fetchInstructorDirectory } from "@/lib/instructor-directory";

export const dynamic = "force-dynamic";

function buildListItems(
  rows: Record<string, string>[],
): InstructorListItem[] {
  return rows
    .filter((row) => pickInstructorName(row) || pickInstructorEmail(row))
    .map((row) => ({
      id: encodeInstructorId(row),
      name: pickInstructorName(row),
      email: pickInstructorEmail(row),
      phone: pickInstructorPhone(row),
      photoCell: (row["Photo"] ?? "").trim() || null,
    }));
}

export default async function InstructorDirectoryPage() {
  try {
    const { rows, fetchedAt } = await fetchInstructorDirectory();
    const items = buildListItems(rows);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Instructor Directory
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Instructor roster tab. Updated{" "}
              <span className="font-mono text-zinc-300">
                {new Date(fetchedAt).toLocaleString()}
              </span>
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-red-400/90 hover:text-red-300"
          >
            ← Dashboard
          </Link>
        </div>

        <InstructorDirectoryTiles items={items} />
      </div>
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load instructor directory.";
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">
          Could not load instructor directory
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Optional env:{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEET_GID_INSTRUCTOR_DIRECTORY
          </code>
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-red-400 hover:text-red-300"
        >
          ← Dashboard
        </Link>
      </div>
    );
  }
}
