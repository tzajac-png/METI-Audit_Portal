import { notFound } from "next/navigation";
import { ProgramCourseDetail } from "@/components/ProgramCourseDetail";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import { getProgramCourseByCode } from "@/lib/program-courses";
import {
  fetchStudentRowsForCourseType,
  filterStudentsByCourseCode,
} from "@/lib/student-roster";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function HeartsaverCourseDetailPage({ params }: Props) {
  const { code: encoded } = await params;
  let courseCode: string;
  try {
    courseCode = decodeURIComponent(encoded);
  } catch {
    notFound();
  }

  const course = await getProgramCourseByCode("Heartsaver", courseCode);
  if (!course) notFound();

  const { rows: students, fetchedAt } =
    await fetchStudentRowsForCourseType("Heartsaver");
  const matched = filterStudentsByCourseCode(students, course.courseCode);
  const audit = getAuditDisplayStatus(course.courseCode);

  return (
    <ProgramCourseDetail
      programTitle="Heartsaver"
      basePath="/courses/heartsaver"
      studentTabLabel="Heartsaver Student"
      course={course}
      students={matched}
      fetchedAt={fetchedAt}
      audit={audit}
    />
  );
}
