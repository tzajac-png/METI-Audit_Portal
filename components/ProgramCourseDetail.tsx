import Link from "next/link";
import type { AuditDisplayStatus } from "@/lib/audit-status";
import { ExportClassPdfButton } from "@/components/ExportClassPdfButton";
import { ExportCourseRosterXlsxButton } from "@/components/ExportCourseRosterXlsxButton";
import { RequestCourseAuditButton } from "@/components/RequestCourseAuditButton";
import type { ProgramCourseSummary } from "@/lib/program-courses";
import { buildCourseRosterXlsxRows } from "@/lib/course-roster-xlsx";
import { NORTHVILLE_BANNER_CLASS } from "@/lib/skills-check-northville";
import type { StudentRow } from "@/lib/student-roster";
import {
  pickStudentField,
  ROSTER_CLASS_DATE_KEYS,
  ROSTER_EMAIL_KEYS,
  ROSTER_FIRST_NAME_KEYS,
  ROSTER_LAST_NAME_KEYS,
  ROSTER_PHONE_KEYS,
  ROSTER_SCORE_KEYS,
} from "@/lib/student-display";

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

type Props = {
  programTitle: string;
  basePath: string;
  studentTabLabel: string;
  course: ProgramCourseSummary;
  students: StudentRow[];
  fetchedAt: string;
  audit: AuditDisplayStatus;
  /**
   * Path segment for this course in URLs (e.g. PALS base64url). When omitted,
   * encodeURIComponent(course.courseCode) is used.
   */
  coursePathSegment?: string;
  /** Optional link shown beside each student name (e.g. certificate upload). */
  studentNameAccessory?: (
    student: StudentRow,
  ) => { href: string; label: string } | null;
};

const DETAIL_KEYS = [
  "CourseCode",
  "PendingCourseID",
  "Lead Instructor",
  "Instructor Number",
  "Expiration Date",
  "Course Location",
  "Course Start Date",
  "Start Time",
  "Course End Date",
  "End Time",
  "Total Hours of Instruction",
  "No. of Cards Issued",
  "Student-Manikin Ratio",
  "Skills Check off Only: Cert Upload ***Can be a photo***",
  "Were there more instructors?",
] as const;

const DETAIL_SET = new Set<string>(DETAIL_KEYS);

const EXTRA_KEYS_HIDDEN = new Set([
  "Course Documents",
  "Roster PDF Link",
  "Timestamp",
]);

export function ProgramCourseDetail({
  programTitle,
  basePath,
  studentTabLabel,
  course,
  students,
  fetchedAt,
  audit,
  coursePathSegment: pathSeg,
  studentNameAccessory,
}: Props) {
  const courseSeg =
    pathSeg ?? encodeURIComponent(course.courseCode.trim());
  const { raw } = course;
  const rosterXlsxRows = buildCourseRosterXlsxRows(students, course.dateLabel);
  const extraKeys = Object.keys(raw).filter(
    (k) =>
      !DETAIL_SET.has(k) &&
      !EXTRA_KEYS_HIDDEN.has(k) &&
      !k.startsWith("[Document Studio]") &&
      !k.startsWith("DEBUG") &&
      k !== "Response Edit URL" &&
      k !== "Response ID",
  );

  return (
    <div className="space-y-8">
      {course.paidForByNorthville ? (
        <div className={NORTHVILLE_BANNER_CLASS}>Bill Northville City</div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={basePath}
            className="text-sm text-red-400/90 hover:text-red-300"
          >
            ← {programTitle} courses
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Course details
          </h1>
          <p className="mt-2 font-mono text-sm text-red-300/90">
            {course.courseCode}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Data refresh: {new Date(fetchedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-red-900/35 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-400/90">
            Date
          </p>
          <p className="mt-1 text-lg text-white">{course.dateLabel}</p>
        </div>
        <div className="rounded-lg border border-red-900/35 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-400/90">
            Lead instructor
          </p>
          <p className="mt-1 text-lg text-white">{course.leadInstructor}</p>
        </div>
        <div className="rounded-lg border border-red-900/35 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-400/90">
            Location
          </p>
          <p className="mt-1 text-lg text-white">{course.location}</p>
        </div>
        <div className="rounded-lg border border-red-900/35 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-400/90">
            Audit status
          </p>
          <p className="mt-1 text-lg">
            {audit.status === "Complete" ? (
              <span className="text-emerald-400">Complete</span>
            ) : (
              <span className="text-amber-200/90">Pending</span>
            )}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Checklist {audit.complianceDone}/{audit.complianceTotal}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <ExportClassPdfButton
          programTitle={programTitle}
          courseCode={course.courseCode.trim()}
          courseDocumentUrl={course.courseDocumentUrl?.trim() || null}
          dateLabel={course.dateLabel}
          leadInstructor={course.leadInstructor}
          location={course.location}
          students={students.map((s) => {
            const first = pickStudentField(s, [...ROSTER_FIRST_NAME_KEYS]);
            const last = pickStudentField(s, [...ROSTER_LAST_NAME_KEYS]);
            const name =
              [first, last].filter(Boolean).join(" ") || "—";
            return {
              name,
              email:
                pickStudentField(s, [...ROSTER_EMAIL_KEYS]) || "—",
              classDate:
                pickStudentField(s, [...ROSTER_CLASS_DATE_KEYS]) || "—",
              score:
                pickStudentField(s, [...ROSTER_SCORE_KEYS]) || "—",
              phone:
                pickStudentField(s, [...ROSTER_PHONE_KEYS]) || "—",
            };
          })}
        />
        {course.courseDocumentUrl ? (
          <a
            href={course.courseDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:border-red-900/50"
          >
            Course documents
          </a>
        ) : null}
        <ExportCourseRosterXlsxButton
          programTitle={programTitle}
          courseCode={course.courseCode.trim()}
          rows={rosterXlsxRows}
        />
        <RequestCourseAuditButton
          courseCode={course.courseCode.trim()}
          programTitle={programTitle}
          dateLabel={course.dateLabel}
          location={course.location}
          leadInstructor={course.leadInstructor}
          auditComplete={audit.status === "Complete"}
        />
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Roster information</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {DETAIL_KEYS.map((key) => {
            const val = raw[key];
            const text = cellText(val);
            if (text.trim() === "") return null;
            return (
              <div
                key={key}
                className="border-b border-zinc-800/80 pb-3 sm:border-b-0"
              >
                <dt className="text-xs font-medium text-zinc-500">{key}</dt>
                <dd className="mt-0.5 text-sm text-zinc-200">{text}</dd>
              </div>
            );
          })}
        </dl>
        {extraKeys.length > 0 ? (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-red-400/90 hover:text-red-300">
              Additional columns ({extraKeys.length})
            </summary>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {extraKeys.map((key) => (
                <div key={key}>
                  <dt className="text-xs text-zinc-600">{key}</dt>
                  <dd className="text-sm text-zinc-400">{cellText(raw[key])}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            Students ({studentTabLabel} tab)
          </h2>
          <p className="text-sm text-zinc-500">
            Matched on course code: {students.length}{" "}
            {students.length === 1 ? "student" : "students"}
          </p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Rows from the student signup sheet where any course-code column matches
          this class. Click a name to view the full record and resource links.
        </p>

        {students.length === 0 ? (
          <p className="mt-6 text-zinc-500">
            No student signups matched this course code yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/30 text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Class date</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {students.map((s, rowIndex) => {
                  const first = pickStudentField(s, [...ROSTER_FIRST_NAME_KEYS]);
                  const last = pickStudentField(s, [...ROSTER_LAST_NAME_KEYS]);
                  const name = [first, last].filter(Boolean).join(" ") || "—";
                  const studentHref = `${basePath}/${courseSeg}/students/${encodeURIComponent(s._rowId)}`;
                  const accessory = studentNameAccessory?.(s) ?? null;
                  return (
                    <tr
                      key={`${rowIndex}-${s._rowId}`}
                      className="text-zinc-300"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <a
                            href={studentHref}
                            className="font-medium text-red-400 hover:text-red-300 hover:underline"
                          >
                            {name}
                          </a>
                          {accessory ? (
                            <a
                              href={accessory.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-zinc-400 hover:text-red-300"
                              title={accessory.label}
                            >
                              {accessory.label}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-[12rem] truncate py-2.5 pr-4 font-mono text-xs">
                        {pickStudentField(s, [...ROSTER_EMAIL_KEYS]) || "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {pickStudentField(s, [...ROSTER_CLASS_DATE_KEYS]) || "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {pickStudentField(s, [...ROSTER_SCORE_KEYS]) || "—"}
                      </td>
                      <td className="py-2.5">
                        {pickStudentField(s, [...ROSTER_PHONE_KEYS]) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        To submit or update a formal audit for this class, sign in and open{" "}
        <Link
          href={`/audit/courses/new?courseCode=${encodeURIComponent(course.courseCode.trim())}`}
          className="text-red-400 hover:text-red-300"
        >
          New audit (prefilled)
        </Link>{" "}
        or the full{" "}
        <a href="/audit/courses" className="text-red-400 hover:text-red-300">
          course audits
        </a>{" "}
        list.
      </p>
    </div>
  );
}
