import { notFound } from "next/navigation";
import { BlsCourseDetail } from "@/components/BlsCourseDetail";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import { getBlsCourseByCode } from "@/lib/bls-courses";
import {
  fetchStudentRows,
  filterStudentsByCourseCode,
} from "@/lib/student-roster";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function BlsCourseDetailPage({ params }: Props) {
  const { code: encoded } = await params;
  let courseCode: string;
  try {
    courseCode = decodeURIComponent(encoded);
  } catch {
    notFound();
  }

  const course = await getBlsCourseByCode(courseCode);
  if (!course) notFound();

  const { rows: students, fetchedAt } = await fetchStudentRows();
  const matched = filterStudentsByCourseCode(students, course.courseCode);
  const audit = getAuditDisplayStatus(course.courseCode);

  return (
    <BlsCourseDetail
      course={course}
      students={matched}
      fetchedAt={fetchedAt}
      audit={audit}
    />
  );
}
