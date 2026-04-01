import { notFound } from "next/navigation";
import Link from "next/link";
import {
  decodeDirectoryStudentId,
  findDirectoryRowByDecodedId,
} from "@/lib/directory-helpers";
import { fetchStudentDirectory } from "@/lib/student-directory";
import { fetchClassHistoryForDirectoryPerson } from "@/lib/student-class-history";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
};

/** Preferred order for demographics; remaining keys follow alphabetically. */
const DEMO_PRIORITY = [
  "First Name",
  "Last Name",
  "Email Address",
  "Email",
  "Phone Number",
  "Phone",
  "Your Address",
  "Town/City",
  "State",
  "Country",
  "Zip Code",
  "Zip",
  "SyncedToAirtable",
];

export default async function StudentDirectoryDetailPage({ params }: Props) {
  const { studentId: rawSegment } = await params;
  let segment = rawSegment;
  try {
    segment = decodeURIComponent(rawSegment);
  } catch {
    notFound();
  }

  const decoded = decodeDirectoryStudentId(segment);
  if (!decoded) notFound();

  const { rows, fetchedAt } = await fetchStudentDirectory();
  const person = findDirectoryRowByDecodedId(rows, decoded);
  if (!person) notFound();

  const classHistory = await fetchClassHistoryForDirectoryPerson(person);

  const allKeys = Object.keys(person).filter((k) => k.trim() !== "");
  const prioritySet = new Set(DEMO_PRIORITY);
  const ordered = [
    ...DEMO_PRIORITY.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !prioritySet.has(k)).sort((a, b) => a.localeCompare(b)),
  ];

  const displayName =
    [person["First Name"], person["Last Name"]].filter(Boolean).join(" ").trim() ||
    person["Email Address"] ||
    person["Email"] ||
    "Student";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/courses/student-directory"
            className="text-sm text-red-400/90 hover:text-red-300"
          >
            ← Student directory
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            {displayName}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Directory record · refreshed{" "}
            {new Date(fetchedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          Contact & demographics
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          All columns from the directory row.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {ordered.map((key) => {
            const val = person[key];
            if (val == null || String(val).trim() === "") return null;
            return (
              <div
                key={key}
                className="border-b border-zinc-800/80 pb-3 sm:border-b-0"
              >
                <dt className="text-xs font-medium text-zinc-500">{key}</dt>
                <dd className="mt-0.5 break-words text-sm text-zinc-200">
                  {val}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          Class history (all programs)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Matched across BLS, ACLS, PALS, and Heartsaver student signup tabs by
          email, or by name and phone when email does not match.
        </p>

        {classHistory.length === 0 ? (
          <p className="mt-6 text-zinc-500">
            No matching course rows found in student signup tabs.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/30 text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Program</th>
                  <th className="py-2 pr-4 font-medium">Course code</th>
                  <th className="py-2 pr-4 font-medium">Class date</th>
                  <th className="py-2 pr-4 font-medium">Instructor</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Tab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {classHistory.map((h, i) => (
                  <tr key={`${h.courseCode}-${h.timestamp}-${i}`} className="text-zinc-300">
                    <td className="py-2.5 pr-4">{h.program}</td>
                    <td className="max-w-[12rem] truncate py-2.5 pr-4 font-mono text-xs">
                      {h.courseCode || "—"}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4">
                      {h.classDate || "—"}
                    </td>
                    <td className="py-2.5 pr-4">{h.instructor || "—"}</td>
                    <td className="py-2.5 pr-4">{h.location || "—"}</td>
                    <td className="py-2.5 pr-4">{h.score || "—"}</td>
                    <td className="py-2.5 pr-4">{h.status || "—"}</td>
                    <td className="py-2.5 text-zinc-500">{h.sourceProgram}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
