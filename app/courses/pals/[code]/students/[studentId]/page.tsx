import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgramStudentDetail } from "@/components/ProgramStudentDetail";
import { getStudentResourceLinks } from "@/lib/student-links";
import {
  PALS_INSTRUCTOR_EDIT_URL,
  PALS_STUDENT_EDIT_URL,
  PALS_STUDENT_TAB_GID,
  PALS_STUDENT_WORKBOOK_ID,
  resolvePalsCourseWithParallelStudentFetch,
} from "@/lib/pals-data";
import {
  filterStudentsByCourseCode,
  findStudentByRowId,
} from "@/lib/student-roster";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = {
  params: Promise<{ code: string; studentId: string }>;
};

function loadError(message: string) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">
          Could not load PALS student data
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Roster source: PALS Student tab gid {PALS_STUDENT_TAB_GID} (workbook{" "}
          {PALS_STUDENT_WORKBOOK_ID.slice(0, 8)}…). Check{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEETS_API_KEY
          </code>
          .
        </p>
      </div>
      <div className="text-sm text-zinc-400">
        <ul className="list-inside list-disc space-y-1">
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
          <Link href="/courses/pals" className="text-red-400 hover:text-red-300">
            ← PALS courses
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function PalsStudentDetailPage({ params }: Props) {
  const { code: encodedCode, studentId: encodedStudentId } = await params;

  const studentRowId = safeDecodePathSegment(encodedStudentId ?? "");
  if (!studentRowId.trim()) notFound();

  let pack: Awaited<
    ReturnType<typeof resolvePalsCourseWithParallelStudentFetch>
  >;
  try {
    pack = await resolvePalsCourseWithParallelStudentFetch(encodedCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load student.";
    return loadError(message);
  }

  if (!pack) notFound();

  const { course, pathSeg } = pack.resolved;
  const allStudents = pack.studentSheet.rows;

  const courseStudents = filterStudentsByCourseCode(
    allStudents,
    course.courseCode,
  );
  const student = findStudentByRowId(courseStudents, studentRowId);
  if (!student) notFound();

  const links = getStudentResourceLinks(student);

  return (
    <ProgramStudentDetail
      basePath="/courses/pals"
      courseCode={course.courseCode}
      coursePathSegment={pathSeg}
      student={student}
      links={links}
    />
  );
}
