import { notFound } from "next/navigation";
import { BlsStudentDetail } from "@/components/BlsStudentDetail";
import { getBlsCourseByCode } from "@/lib/bls-courses";
import { getStudentResourceLinks } from "@/lib/student-links";
import {
  fetchStudentRows,
  filterStudentsByCourseCode,
  findStudentByRowId,
} from "@/lib/student-roster";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string; studentId: string }>;
};

export default async function BlsStudentDetailPage({ params }: Props) {
  const { code: encodedCode, studentId: encodedStudentId } = await params;

  const courseCode = safeDecodePathSegment(encodedCode ?? "");
  const studentRowId = safeDecodePathSegment(encodedStudentId ?? "");

  const course = await getBlsCourseByCode(courseCode);
  if (!course) notFound();

  const { rows: allStudents } = await fetchStudentRows();
  const courseStudents = filterStudentsByCourseCode(
    allStudents,
    course.courseCode,
  );
  const student = findStudentByRowId(courseStudents, studentRowId);
  if (!student) notFound();

  const links = getStudentResourceLinks(student);

  return (
    <BlsStudentDetail
      courseCode={course.courseCode}
      student={student}
      links={links}
    />
  );
}
