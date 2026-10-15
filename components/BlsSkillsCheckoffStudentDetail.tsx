import type { StudentRow } from "@/lib/student-roster";
import type { BlsSkillsCheckoffStudentLinks } from "@/lib/bls-skills-checkoff-student-links";
import { ProgramStudentDetail } from "@/components/ProgramStudentDetail";

type Props = {
  courseCode: string;
  student: StudentRow;
  links: BlsSkillsCheckoffStudentLinks;
};

export function BlsSkillsCheckoffStudentDetail({
  courseCode,
  student,
  links,
}: Props) {
  return (
    <ProgramStudentDetail
      basePath="/courses/bls-skills-checkoff"
      courseCode={courseCode}
      student={student}
      links={links}
      showExam={false}
      certificateUrl={links.certificate}
      evaluationLabel="Evaluations"
    />
  );
}
