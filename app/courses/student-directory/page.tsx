import Link from "next/link";
import {
  StudentDirectoryTable,
  type DirectoryListItem,
} from "@/components/StudentDirectoryTable";
import {
  encodeDirectoryStudentId,
  pickDirectoryEmail,
} from "@/lib/directory-helpers";
import { fetchStudentDirectory } from "@/lib/student-directory";

export const dynamic = "force-dynamic";

function buildListItems(
  rows: Record<string, string>[],
): DirectoryListItem[] {
  return rows.map((row) => ({
    id: encodeDirectoryStudentId(row),
    first: (row["First Name"] ?? "").trim(),
    last: (row["Last Name"] ?? "").trim(),
    email: pickDirectoryEmail(row),
    phone: (row["Phone Number"] ?? row["Phone"] ?? "").trim(),
  }));
}

export default async function StudentDirectoryPage() {
  try {
    const { rows, fetchedAt } = await fetchStudentDirectory();
    const items = buildListItems(rows);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Student directory
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Student Master tab. Updated{" "}
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

        <StudentDirectoryTable items={items} />
      </div>
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load directory.";
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">
          Could not load student directory
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Optional env:{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEET_GID_STUDENT_DIRECTORY
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
