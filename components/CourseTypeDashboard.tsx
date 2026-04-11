import Link from "next/link";
import { ImportantDatesPanel } from "@/components/ImportantDatesPanel";
import { COURSE_TYPES, type CourseType } from "@/lib/course";
import { INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL } from "@/lib/instructor-upload-form";

const ROUTES: Record<CourseType, string> = {
  BLS: "/courses/bls",
  ACLS: "/courses/acls",
  PALS: "/courses/pals",
  Heartsaver: "/courses/heartsaver",
};

const STUDENT_DIRECTORY_HREF = "/courses/student-directory";
const INSTRUCTOR_DIRECTORY_HREF = "/courses/instructor-directory";

const BLURBS: Record<CourseType, string> = {
  BLS: "Basic Life Support — Schedules and Rosters",
  ACLS: "Advanced Cardiovascular Life Support",
  PALS: "Pediatric Advanced Life Support",
  Heartsaver: "Heartsaver Courses",
};

export function CourseTypeDashboard() {
  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Course <span className="text-red-500">Dashboard</span>
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Choose a program to view scheduled courses, locations, and participant
          rosters pulled from METI spreadsheets.
        </p>
      </div>

      <ImportantDatesPanel />

      <div className="rounded-xl border border-red-900/35 bg-[var(--surface)] p-5 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">
          Instructor document submissions
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Upload credentials and paperwork through the Google Form — files are
          stored in Drive and linked on each instructor&apos;s directory page by
          document type.
        </p>
        <a
          href={INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-lg border border-red-600/60 bg-red-950/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-950/80"
        >
          Open instructor document form →
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSE_TYPES.map((t) => (
          <Link
            key={t}
            href={ROUTES[t]}
            className="group rounded-xl border border-red-900/35 bg-[var(--surface)] p-6 shadow-lg shadow-black/30 transition hover:border-red-500/50 hover:bg-zinc-900/60"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400/90">
              Program
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-red-100">
              {t}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {BLURBS[t]}
            </p>
            <p className="mt-4 text-sm font-medium text-red-400 group-hover:text-red-300">
              Open →
            </p>
          </Link>
        ))}
        <Link
          href={STUDENT_DIRECTORY_HREF}
          className="group rounded-xl border border-red-900/35 bg-[var(--surface)] p-6 shadow-lg shadow-black/30 transition hover:border-red-500/50 hover:bg-zinc-900/60"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400/90">
            Master List
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-red-100">
            Student Directory
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            All students from the Student Master tab (name, email, phone,
            address).
          </p>
          <p className="mt-4 text-sm font-medium text-red-400 group-hover:text-red-300">
            Open →
          </p>
        </Link>
        <Link
          href={INSTRUCTOR_DIRECTORY_HREF}
          className="group rounded-xl border border-red-900/35 bg-[var(--surface)] p-6 shadow-lg shadow-black/30 transition hover:border-red-500/50 hover:bg-zinc-900/60"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400/90">
            Roster
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-red-100">
            Instructor Directory
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Instructor roster from Student Sign Up 2026 — credentials, uploads, and
            compliance documents.
          </p>
          <p className="mt-4 text-sm font-medium text-red-400 group-hover:text-red-300">
            Open →
          </p>
        </Link>
      </div>
    </div>
  );
}
