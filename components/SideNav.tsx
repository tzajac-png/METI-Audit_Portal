"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardSignOutButton } from "@/components/DashboardSignOutButton";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const NAVIGATION: NavItem[] = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/aligned-instructors-admin", label: "Aligned Instructors Admin" },
  { href: "/audit/courses", label: "Admin Audit" },
];

const PROGRAMS: NavItem[] = [
  { href: "/courses/bls", label: "BLS" },
  { href: "/courses/acls", label: "ACLS" },
  { href: "/courses/pals", label: "PALS" },
  { href: "/courses/heartsaver", label: "Heartsaver" },
  { href: "/courses/bls-skills-checkoff", label: "HS Skill Check" },
  { href: "/courses/ems-ce", label: "EMS CE Course" },
  { href: "/courses/student-directory", label: "Student Directory" },
  { href: "/courses/instructor-directory", label: "Instructor Directory" },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function navLinkClass(active: boolean): string {
  const base = "block rounded-lg px-3 py-2 text-sm transition";
  return active
    ? `${base} bg-red-950/50 font-medium text-red-100 ring-1 ring-inset ring-red-800/50`
    : `${base} text-zinc-300 hover:bg-zinc-900/70 hover:text-white`;
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-red-900/35 bg-black sm:w-64">
      <div className="border-b border-red-900/25 px-4 py-4">
        <Link href="/" className="block w-fit transition-opacity hover:opacity-95">
          <Image
            src="/meti-logo.png"
            alt="Michigan Emergency Training Institute — METI"
            width={720}
            height={315}
            className="h-auto max-h-28 w-auto max-w-full object-contain object-left mix-blend-lighten sm:max-h-32"
            priority
          />
        </Link>
        <p className="mt-2 text-sm font-semibold tracking-tight text-white">
          METI <span className="text-red-500">Course Portal</span>
        </p>
        <p className="text-xs text-zinc-500">BLS · ACLS · PALS · Heartsaver</p>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-5">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-red-400/80">
            Navigation
          </p>
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(isActive(pathname, item))}
            >
              {item.label}
            </Link>
          ))}
          <DashboardSignOutButton className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900/70 hover:text-white" />
        </div>

        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-red-400/80">
            Programs
          </p>
          {PROGRAMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(isActive(pathname, item))}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
