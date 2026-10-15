import Link from "next/link";
import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { ProgramCourseSummary } from "@/lib/program-courses";
import {
  NORTHVILLE_LEGEND_CLASS,
  NORTHVILLE_ROW_CLASS,
} from "@/lib/skills-check-northville";

type Props = {
  programTitle: string;
  basePath: string;
  courses: ProgramCourseSummary[];
  fetchedAt: string;
  auditByCode: Record<string, AuditDisplayStatus>;
  /**
   * When set, "View" links use `${basePath}/${coursePathSegment(course)}`
   * instead of encodeURIComponent (used by PALS with base64url segments).
   */
  coursePathSegment?: (course: ProgramCourseSummary) => string;
  /** Defaults to “Instructor Roster”. */
  sourceTabLabel?: string;
  /** Extra row classes (e.g. Northville billing highlight). */
  rowClassName?: (course: ProgramCourseSummary) => string | undefined;
};

export function ProgramCourseList({
  programTitle,
  basePath,
  courses,
  fetchedAt,
  auditByCode,
  coursePathSegment,
  sourceTabLabel = "Instructor Roster",
  rowClassName,
}: Props) {
  const showNorthvilleLegend = courses.some((c) => c.paidForByNorthville);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {programTitle} courses
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            From the {sourceTabLabel} tab. Updated{" "}
            <span className="font-mono text-zinc-300">
              {new Date(fetchedAt).toLocaleString()}
            </span>
          </p>
          {showNorthvilleLegend ? (
            <p className={`mt-2 ${NORTHVILLE_LEGEND_CLASS}`}>
              Rows in red bill to Northville City.
            </p>
          ) : null}
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm text-red-400 hover:text-red-300"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[var(--surface)]">
        <div className="max-h-[min(75vh,880px)] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-zinc-800">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Course code
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Date
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Lead instructor
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Location
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-red-400">
                  Audit status
                </th>
                <th className="px-4 py-3" />
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
                courses.map((c, rowIndex) => {
                  const audit = auditByCode[c.courseCode];
                  const extraRow = rowClassName?.(c) ?? "";
                  const northville = c.paidForByNorthville
                    ? NORTHVILLE_ROW_CLASS
                    : "hover:bg-zinc-900/40";
                  return (
                    <tr
                      key={`${rowIndex}-${c.courseCode}`}
                      className={`${northville} ${extraRow}`.trim()}
                    >
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
                        {/* Plain <a>: PALS hex segments + RSC prefetch sometimes left "View" inert; full navigation is reliable. */}
                        <a
                          href={
                            coursePathSegment
                              ? `${basePath}/${coursePathSegment(c)}`
                              : `${basePath}/${encodeURIComponent(c.courseCode.trim())}`
                          }
                          className="font-medium text-red-400 hover:text-red-300"
                        >
                          View
                        </a>
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
