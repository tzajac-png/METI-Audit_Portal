import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { BlsSkillsCheckoffCourseSummary } from "@/lib/bls-skills-checkoff";
import { ProgramCourseList } from "@/components/ProgramCourseList";

type Props = {
  courses: BlsSkillsCheckoffCourseSummary[];
  fetchedAt: string;
  auditByCode: Record<string, AuditDisplayStatus>;
};

export function BlsSkillsCheckoffCourseList(props: Props) {
  return (
    <ProgramCourseList
      programTitle="HS Skill Check"
      basePath="/courses/bls-skills-checkoff"
      sourceTabLabel="HS BLS Skills Check Instructor"
      {...props}
    />
  );
}
