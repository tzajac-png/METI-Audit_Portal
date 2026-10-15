import Link from "next/link";
import { ProgramCourseList } from "@/components/ProgramCourseList";
import { encodeCoursePathSegment } from "@/lib/course-path-codec";
import { getAuditDisplayStatusForCodes } from "@/lib/audit-status";
import {
  PALS_INSTRUCTOR_EDIT_URL,
  PALS_STUDENT_EDIT_URL,
  fetchPalsCourses,
} from "@/lib/pals-data";

export const dynamic = "force-dynamic";
/** Vercel: allow slow Google Sheets + one Blob read (requires Pro for >10s). */
export const maxDuration = 60;

export default async function PalsCoursesPage() {
  try {
    const { courses, fetchedAt } = await fetchPalsCourses();
    const auditByCode = await getAuditDisplayStatusForCodes(
      courses.map((c) => c.courseCode),
    );
    return (
      <ProgramCourseList
        programTitle="PALS"
        basePath="/courses/pals"
        courses={courses}
        fetchedAt={fetchedAt}
        auditByCode={auditByCode}
        coursePathSegment={(c) => encodeCoursePathSegment(c.courseCode.trim())}
      />
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load roster.";
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
          <h1 className="text-xl font-semibold text-red-400">
            Could not load PALS courses
          </h1>
          <p className="mt-2 text-zinc-300">{message}</p>
          <p className="mt-4 text-sm text-zinc-500">
            Data is read from the official Instructor PALS tab (gid 547470971)
            in the METI workbook. Confirm the sheet is shared for viewing and
            that{" "}
            <code className="rounded bg-zinc-900 px-1 text-red-300">
              GOOGLE_SHEETS_API_KEY
            </code>{" "}
            is set on the server (or CSV fallback for local dev only).
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">Source tabs</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <a
                href={PALS_INSTRUCTOR_EDIT_URL}
                className="text-red-400 hover:text-red-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instructor — PALS
              </a>
            </li>
            <li>
              <a
                href={PALS_STUDENT_EDIT_URL}
                className="text-red-400 hover:text-red-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                PALS Student
              </a>
            </li>
          </ul>
          <p className="mt-4">
            <Link href="/" className="text-red-400 hover:text-red-300">
              ← Dashboard
            </Link>
          </p>
        </div>
      </div>
    );
  }
}
