import { notFound } from "next/navigation";
import { ProgramStudentDetail } from "@/components/ProgramStudentDetail";
import { getProgramCourseByCode } from "@/lib/program-courses";
import { getStudentResourceLinks } from "@/lib/student-links";
import {
  fetchStudentRowsForCourseType,
  filterStudentsByCourseCode,
  findStudentByRowId,
} from "@/lib/student-roster";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string; studentId: string }>;
};

export default async function AclsStudentDetailPage({ params }: Props) {
  const { code: encodedCode, studentId: encodedStudentId } = await params;

  let courseCode: string;
  let studentRowId: string;
  try {
    courseCode = decodeURIComponent(encodedCode);
    studentRowId = decodeURIComponent(encodedStudentId);
  } catch {
    notFound();
  }

  const course = await getProgramCourseByCode("ACLS", courseCode);
  if (!course) notFound();

  const { rows: allStudents } = await fetchStudentRowsForCourseType("ACLS");
  const courseStudents = filterStudentsByCourseCode(
    allStudents,
    course.courseCode,
  );
  const student = findStudentByRowId(courseStudents, studentRowId);
  if (!student) notFound();

  const links = getStudentResourceLinks(student);

  return (
    <ProgramStudentDetail
      basePath="/courses/acls"
      courseCode={course.courseCode}
      student={student}
      links={links}
    />
  );
}
