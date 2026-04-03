import { AuditToolbar } from "@/components/AuditToolbar";
import { AuditRecordForm } from "@/components/AuditRecordForm";
import { fetchAllInstructorCoursesForAudit } from "@/lib/instructor-courses";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ courseCode?: string | string[] }>;
};

export default async function NewAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.courseCode;
  const initialCourseCode =
    typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw) && typeof raw[0] === "string"
        ? raw[0].trim()
        : "";

  const { courses, fetchErrors } = await fetchAllInstructorCoursesForAudit();

  return (
    <div className="space-y-4">
      <AuditToolbar />
      <div>
        <h1 className="text-2xl font-semibold text-white">New course audit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Complete the checklist and save. You will return to the course audits list
          after a successful save.
        </p>
      </div>
      {fetchErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          <p className="font-medium text-amber-100">Some sheets did not load</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {fetchErrors.map((e) => (
              <li key={e.type}>
                {e.type}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AuditRecordForm
        courses={courses}
        initialCourseCode={initialCourseCode || undefined}
      />
    </div>
  );
}
