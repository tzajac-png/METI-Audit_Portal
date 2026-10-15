import Link from "next/link";
import { COURSE_TYPES, type CourseType } from "@/lib/course";

const ROUTES: Record<CourseType, string> = {
  BLS: "/courses/bls",
  ACLS: "/courses/acls",
  PALS: "/courses/pals",
  Heartsaver: "/courses/heartsaver",
};

const STUDENT_DIRECTORY_HREF = "/courses/student-directory";
const INSTRUCTOR_DIRECTORY_HREF = "/courses/instructor-directory";
const BLS_SKILLS_CHECKOFF_HREF = "/courses/bls-skills-checkoff";
const EMS_CE_HREF = "/courses/ems-ce";

const BLURBS: Record<CourseType, string> = {
  BLS: "Basic Life Support — Schedules and Rosters",
  ACLS: "Advanced Cardiovascular Life Support",
  PALS: "Pediatric Advanced Life Support",
  Heartsaver: "Heartsaver Courses",
};

const cardClassName =
  "group flex min-h-[11.5rem] flex-col rounded-xl border border-red-900/40 bg-[var(--surface)] p-6 transition hover:border-red-500/55 hover:bg-zinc-900/70";

function DashboardCard({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={cardClassName}>
      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-red-50">
        {title}
      </h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <p className="mt-4 text-sm font-medium text-red-400 group-hover:text-red-300">
        Open →
      </p>
    </Link>
  );
}

export function CourseTypeDashboard() {
  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Course <span className="text-red-500">Dashboard</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Choose a program to view scheduled courses, locations, and participant
          rosters pulled from METI spreadsheets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSE_TYPES.map((t) => (
          <DashboardCard
            key={t}
            href={ROUTES[t]}
            eyebrow="Program"
            title={t}
            description={BLURBS[t]}
          />
        ))}
        <DashboardCard
          href={BLS_SKILLS_CHECKOFF_HREF}
          eyebrow="Program"
          title="HS Skill Check"
          description="Skills check sessions — instructor roster and student signups linked to audit status. Rows in red bill to Northville City."
        />
        <DashboardCard
          href={EMS_CE_HREF}
          eyebrow="Program"
          title="EMS CE Course"
          description="State CE submissions and status, course materials, and class creation with paperwork generation and upload tracking."
        />
        <DashboardCard
          href={STUDENT_DIRECTORY_HREF}
          eyebrow="Master List"
          title="Student Directory"
          description="All students from the Student Master tab (name, email, phone, address)."
        />
        <DashboardCard
          href={INSTRUCTOR_DIRECTORY_HREF}
          eyebrow="Roster"
          title="Instructor Directory"
          description="Instructor roster — credentials, uploads, and compliance documents."
        />
      </div>
    </div>
  );
}
