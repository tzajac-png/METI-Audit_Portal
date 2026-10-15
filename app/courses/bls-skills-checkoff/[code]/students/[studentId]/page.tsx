import { notFound } from "next/navigation";
import { BlsSkillsCheckoffStudentDetail } from "@/components/BlsSkillsCheckoffStudentDetail";
import {
  fetchBlsSkillsCheckoffStudentRows,
  getBlsSkillsCheckoffCourseByCode,
} from "@/lib/bls-skills-checkoff";
import { getBlsSkillsCheckoffStudentLinks } from "@/lib/bls-skills-checkoff-student-links";
import {
  filterStudentsByCourseCode,
  findStudentByRowId,
} from "@/lib/student-roster";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string; studentId: string }>;
};

export default async function BlsSkillsCheckoffStudentDetailPage({
  params,
}: Props) {
  const { code: encodedCode, studentId: encodedStudentId } = await params;

  const courseCode = safeDecodePathSegment(encodedCode ?? "");
  const studentRowId = safeDecodePathSegment(encodedStudentId ?? "");

  const course = await getBlsSkillsCheckoffCourseByCode(courseCode);
  if (!course) notFound();

  const { rows: allStudents } = await fetchBlsSkillsCheckoffStudentRows();
  const courseStudents = filterStudentsByCourseCode(
    allStudents,
    course.courseCode,
  );
  const student = findStudentByRowId(courseStudents, studentRowId);
  if (!student) notFound();

  const links = getBlsSkillsCheckoffStudentLinks(student);

  return (
    <BlsSkillsCheckoffStudentDetail
      courseCode={course.courseCode}
      student={student}
      links={links}
    />
  );
}
