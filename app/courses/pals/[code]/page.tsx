import { notFound } from "next/navigation";
import { ProgramCourseDetail } from "@/components/ProgramCourseDetail";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import { getProgramCourseByCode } from "@/lib/program-courses";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";
import {
  fetchStudentRowsForCourseType,
  filterStudentsByCourseCode,
} from "@/lib/student-roster";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function PalsCourseDetailPage({ params }: Props) {
  const { code: encoded } = await params;
  const courseCode = safeDecodePathSegment(encoded ?? "");

  const course = await getProgramCourseByCode("PALS", courseCode);
  if (!course) notFound();

  const { rows: students, fetchedAt } =
    await fetchStudentRowsForCourseType("PALS");
  const matched = filterStudentsByCourseCode(students, course.courseCode);
  const audit = await getAuditDisplayStatus(course.courseCode);

  return (
    <ProgramCourseDetail
      programTitle="PALS"
      basePath="/courses/pals"
      studentTabLabel="PALS Student"
      course={course}
      students={matched}
      fetchedAt={fetchedAt}
      audit={audit}
    />
  );
}
