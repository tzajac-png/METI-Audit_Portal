import { ProgramCourseList } from "@/components/ProgramCourseList";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import { fetchProgramCourseSummaries } from "@/lib/program-courses";

export const dynamic = "force-dynamic";

export default async function HeartsaverCoursesPage() {
  try {
    const { courses, fetchedAt } =
      await fetchProgramCourseSummaries("Heartsaver");
    const auditByCode = Object.fromEntries(
      courses.map((c) => [c.courseCode, getAuditDisplayStatus(c.courseCode)]),
    );
    return (
      <ProgramCourseList
        programTitle="Heartsaver"
        basePath="/courses/heartsaver"
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
          Could not load Heartsaver courses
        </h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Confirm the Heartsaver Instructor tab is shared for link viewing.
          Optional env:{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">
            GOOGLE_SHEET_GID_HEARTSAVER_INSTRUCTOR
          </code>
        </p>
      </div>
    );
  }
}
