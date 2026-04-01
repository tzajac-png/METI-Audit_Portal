import Link from "next/link";
import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { ProgramCourseSummary } from "@/lib/program-courses";

type Props = {
  programTitle: string;
  basePath: string;
  courses: ProgramCourseSummary[];
  fetchedAt: string;
  auditByCode: Record<string, AuditDisplayStatus>;
};

export function ProgramCourseList({
  programTitle,
  basePath,
  courses,
  fetchedAt,
  auditByCode,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {programTitle} courses
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            From the Instructor Roster tab. Updated{" "}
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

      <div className="overflow-hidden rounded-xl border border-red-900/30 bg-[var(--surface)]">
        <div className="max-h-[min(75vh,880px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-red-900/35">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Course code
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Date
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Lead instructor
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Location
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-200">
                  Audit status
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {courses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    No {programTitle} courses found in the roster tab.
                  </td>
                </tr>
              ) : (
                courses.map((c) => {
                  const audit = auditByCode[c.courseCode];
                  return (
                    <tr key={c.courseCode} className="hover:bg-zinc-900/40">
                      <td className="max-w-[14rem] px-4 py-3 font-mono text-xs text-zinc-200">
                        {c.courseCode}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                        {c.dateLabel}
                      </td>
                      <td className="px-4 py-3 text-zinc-200">
                        {c.leadInstructor}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{c.location}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {audit?.status === "Complete" ? (
                          <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                            Complete
                          </span>
                        ) : (
                          <span className="rounded bg-amber-950/50 px-2 py-0.5 text-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`${basePath}/${encodeURIComponent(c.courseCode)}`}
                          className="font-medium text-red-400 hover:text-red-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
