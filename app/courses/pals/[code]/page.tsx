import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgramCourseDetail } from "@/components/ProgramCourseDetail";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import {
  PALS_INSTRUCTOR_EDIT_URL,
  PALS_STUDENT_EDIT_URL,
  PALS_STUDENT_TAB_GID,
  PALS_STUDENT_WORKBOOK_ID,
  resolvePalsCourseWithParallelStudentFetch,
} from "@/lib/pals-data";
import { filterStudentsByCourseCode } from "@/lib/student-roster";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = {
  params: Promise<{ code: string }>;
};

function loadError(message: string) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">
          Could not load PALS class
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Data is loaded in parallel from the Instructor PALS tab and the PALS
          Student tab{" "}
          <span className="font-mono text-zinc-400">
            (workbook {PALS_STUDENT_WORKBOOK_ID.slice(0, 8)}…, gid{" "}
            {PALS_STUDENT_TAB_GID})
          </span>
          . Confirm{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEETS_API_KEY
          </code>{" "}
          and workbook sharing on the server.
        </p>
      </div>
      <div className="text-sm text-zinc-400">
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
              PALS Student (gid {PALS_STUDENT_TAB_GID})
            </a>
          </li>
        </ul>
        <p className="mt-4">
          <Link href="/courses/pals" className="text-red-400 hover:text-red-300">
            ← PALS courses
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function PalsCourseDetailPage({ params }: Props) {
  const { code: encoded } = await params;

  let pack: Awaited<
    ReturnType<typeof resolvePalsCourseWithParallelStudentFetch>
  >;
  try {
    pack = await resolvePalsCourseWithParallelStudentFetch(encoded);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load class.";
    return loadError(message);
  }

  if (!pack) notFound();

  const { resolved, studentSheet } = pack;
  const { course, pathSeg, instructorRowMissing } = resolved;

  const students = filterStudentsByCourseCode(
    studentSheet.rows,
    course.courseCode,
  );
  const { fetchedAt } = studentSheet;

  let audit;
  try {
    audit = await getAuditDisplayStatus(course.courseCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Audit status failed.";
    return loadError(message);
  }

  return (
    <div className="space-y-4">
      {instructorRowMissing ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
          This course code is not on the current Instructor PALS tab (it may
          have been edited or removed). Showing the class view for the code you
          opened, with roster rows from the PALS Student tab that still match
          this code.
        </p>
      ) : null}
      <ProgramCourseDetail
        programTitle="PALS"
        basePath="/courses/pals"
        studentTabLabel="PALS Student"
        course={course}
        students={students}
        fetchedAt={fetchedAt}
        audit={audit}
        coursePathSegment={pathSeg}
      />
    </div>
  );
}
