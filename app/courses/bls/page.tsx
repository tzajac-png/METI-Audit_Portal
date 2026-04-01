import { BlsCourseList } from "@/components/BlsCourseList";
import { getAuditDisplayStatus } from "@/lib/audit-status";
import { fetchBlsCourseSummaries } from "@/lib/bls-courses";

export const dynamic = "force-dynamic";

export default async function BlsCoursesPage() {
  try {
    const { courses, fetchedAt } = await fetchBlsCourseSummaries();
    const auditByCode = Object.fromEntries(
      courses.map((c) => [c.courseCode, getAuditDisplayStatus(c.courseCode)]),
    );
    return (
      <BlsCourseList
        courses={courses}
        fetchedAt={fetchedAt}
        auditByCode={auditByCode}
      />
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load roster.";
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8">
        <h1 className="text-xl font-semibold text-red-400">Could not load BLS courses</h1>
        <p className="mt-2 text-zinc-300">{message}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Confirm the Instructor Roster tab is shared for link viewing. Optional env:{" "}
          <code className="rounded bg-zinc-900 px-1 text-red-300">GOOGLE_SHEET_GID_BLS_INSTRUCTOR</code>
        </p>
      </div>
    );
  }
}
