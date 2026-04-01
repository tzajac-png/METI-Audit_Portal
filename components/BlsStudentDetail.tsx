import type { StudentRow } from "@/lib/student-roster";
import { ProgramStudentDetail } from "@/components/ProgramStudentDetail";
import type { StudentResourceLinks } from "@/lib/student-links";

type Props = {
  courseCode: string;
  student: StudentRow;
  links: StudentResourceLinks;
};

export function BlsStudentDetail(props: Props) {
  return <ProgramStudentDetail basePath="/courses/bls" {...props} />;
}
