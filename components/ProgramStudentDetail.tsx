import Link from "next/link";
import type { StudentRow } from "@/lib/student-roster";
import {
  isStatusComplete,
  pickStudentField,
  STUDENT_DETAIL_FIELDS_ORDER,
} from "@/lib/student-display";
import type { StudentResourceLinks } from "@/lib/student-links";

type Props = {
  basePath: string;
  courseCode: string;
  student: StudentRow;
  links: StudentResourceLinks;
};

function ResourceButton({
  href,
  label,
}: {
  href: string | undefined;
  label: string;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-950/70"
      >
        {label}
      </a>
    );
  }
  return (
    <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-500">
      {label} — no link in sheet
    </span>
  );
}

export function ProgramStudentDetail({
  basePath,
  courseCode,
  student,
  links,
}: Props) {
  const first = pickStudentField(student, ["First Name"]);
  const last = pickStudentField(student, ["Last Name"]);
  const displayName =
    [first, last].filter(Boolean).join(" ") || "Student";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`${basePath}/${encodeURIComponent(courseCode)}`}
          className="text-sm text-red-400/90 hover:text-red-300"
        >
          ← {courseCode}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {displayName}
        </h1>
      </div>

      <section className="flex flex-wrap gap-3">
        <ResourceButton
          href={student._skillsSheetUrl || undefined}
          label="Skills sheet"
        />
        <ResourceButton href={student._examPdfUrl || undefined} label="Exam" />
        <ResourceButton
          href={links.evaluation || undefined}
          label="Evaluation"
        />
      </section>

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Student record</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {STUDENT_DETAIL_FIELDS_ORDER.map((field) => {
            const val = pickStudentField(student, field.headerKeys);
            if (!val) return null;
            const statusGreen =
              field.statusHighlight === "complete" && isStatusComplete(val);
            return (
              <div
                key={field.label}
                className="border-b border-zinc-800/80 pb-3 sm:border-b-0"
              >
                <dt className="text-xs font-medium text-zinc-500">
                  {field.label}
                </dt>
                <dd
                  className={
                    statusGreen
                      ? "mt-0.5 break-words text-sm font-medium text-emerald-400"
                      : "mt-0.5 break-words text-sm text-zinc-200"
                  }
                >
                  {val}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
