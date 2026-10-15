import type { AuditDisplayStatus } from "@/lib/audit-status";
import type { BlsSkillsCheckoffCourseSummary } from "@/lib/bls-skills-checkoff";
import { blsSkillsCheckoffCertificateUrl } from "@/lib/bls-skills-checkoff-student-links";
import { ProgramCourseDetail } from "@/components/ProgramCourseDetail";
import type { StudentRow } from "@/lib/student-roster";

type Props = {
  course: BlsSkillsCheckoffCourseSummary;
  students: StudentRow[];
  fetchedAt: string;
  audit: AuditDisplayStatus;
};

export function BlsSkillsCheckoffCourseDetail(props: Props) {
  return (
    <ProgramCourseDetail
      programTitle="HS BLS Skills Check"
      basePath="/courses/bls-skills-checkoff"
      studentTabLabel="HS BLS Skills Check"
      studentNameAccessory={(student) => {
        const href = blsSkillsCheckoffCertificateUrl(student);
        return href ? { href, label: "Certificate" } : null;
      }}
      {...props}
    />
  );
}
