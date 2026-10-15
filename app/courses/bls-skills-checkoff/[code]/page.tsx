import { notFound } from "next/navigation";
import { BlsSkillsCheckoffCourseDetail } from "@/components/BlsSkillsCheckoffCourseDetail";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import {
  fetchBlsSkillsCheckoffStudentsForCourse,
  getBlsSkillsCheckoffCourseByCode,
} from "@/lib/bls-skills-checkoff";
import { safeDecodePathSegment } from "@/lib/safe-decode-path-segment";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function BlsSkillsCheckoffCourseDetailPage({
  params,
}: Props) {
  const { code: encoded } = await params;
  const courseCode = safeDecodePathSegment(encoded ?? "");

  const course = await getBlsSkillsCheckoffCourseByCode(courseCode);
  if (!course) notFound();

  const { students: matched, fetchedAt } =
    await fetchBlsSkillsCheckoffStudentsForCourse(course.courseCode);
  const audit = await getAuditDisplayStatus(course.courseCode);

  return (
    <BlsSkillsCheckoffCourseDetail
      course={course}
      students={matched}
      fetchedAt={fetchedAt}
      audit={audit}
    />
  );
}
