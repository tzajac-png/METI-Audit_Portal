import { notFound } from "next/navigation";
import { ProgramStudentDetail } from "@/components/ProgramStudentDetail";
import { getProgramCourseByCode } from "@/lib/program-courses";
import { getStudentResourceLinks } from "@/lib/student-links";
import {
  fetchStudentRowsForCourseType,
  filterStudentsByCourseCode,
  findStudentByRowId,
} from "@/lib/student-roster";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string; studentId: string }>;
};

export default async function HeartsaverStudentDetailPage({ params }: Props) {
  const { code: encodedCode, studentId: encodedStudentId } = await params;

  const courseCode = safeDecodePathSegment(encodedCode ?? "");
  const studentRowId = safeDecodePathSegment(encodedStudentId ?? "");

  const course = await getProgramCourseByCode("Heartsaver", courseCode);
  if (!course) notFound();

  const { rows: allStudents } =
    await fetchStudentRowsForCourseType("Heartsaver");
  const courseStudents = filterStudentsByCourseCode(
    allStudents,
    course.courseCode,
  );
  const student = findStudentByRowId(courseStudents, studentRowId);
  if (!student) notFound();

  const links = getStudentResourceLinks(student);

  return (
    <ProgramStudentDetail
      basePath="/courses/heartsaver"
      courseCode={course.courseCode}
      student={student}
      links={links}
    />
  );
}
