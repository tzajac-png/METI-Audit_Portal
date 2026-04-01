import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { BlsCourseSummary } from "@/lib/bls-courses";
import { ProgramCourseList } from "@/components/ProgramCourseList";

type Props = {
  courses: BlsCourseSummary[];
  fetchedAt: string;
  auditByCode: Record<string, AuditDisplayStatus>;
};

export function BlsCourseList(props: Props) {
  return (
    <ProgramCourseList
      programTitle="BLS"
      basePath="/courses/bls"
      {...props}
    />
  );
}
