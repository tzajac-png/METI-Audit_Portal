import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { BlsCourseSummary } from "@/lib/bls-courses";
import { ProgramCourseDetail } from "@/components/ProgramCourseDetail";
import type { StudentRow } from "@/lib/student-roster";

type Props = {
  course: BlsCourseSummary;
  students: StudentRow[];
  fetchedAt: string;
  audit: AuditDisplayStatus;
};

export function BlsCourseDetail(props: Props) {
  return (
    <ProgramCourseDetail
      programTitle="BLS"
      basePath="/courses/bls"
      studentTabLabel="BLS Student"
      {...props}
    />
  );
}
