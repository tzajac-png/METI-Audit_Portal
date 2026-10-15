import { BlsSkillsCheckoffCourseList } from "@/components/BlsSkillsCheckoffCourseList";
import { getAuditDisplayStatusForCodes } from "@/lib/audit-status";
import { fetchBlsSkillsCheckoffCourseSummaries } from "@/lib/bls-skills-checkoff";

export const dynamic = "force-dynamic";

export default async function BlsSkillsCheckoffCoursesPage() {
  try {
    const { courses, fetchedAt } = await fetchBlsSkillsCheckoffCourseSummaries();
    const auditByCode = await getAuditDisplayStatusForCodes(
      courses.map((c) => c.courseCode),
    );
    return (
      <BlsSkillsCheckoffCourseList
        courses={courses}
        fetchedAt={fetchedAt}
        auditByCode={auditByCode}
      />
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load roster.";
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">
          Could not load HS BLS Skills Check courses
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Confirm the HS BLS Skills Check Instructor tab is shared for link
          viewing. Courses appear after an instructor submits the class form
          with a Course ID. Optional env:{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEET_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR
          </code>
        </p>
      </div>
    );
  }
}
