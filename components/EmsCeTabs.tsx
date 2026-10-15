"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/courses/ems-ce/state-submissions",
    label: "State submissions",
  },
  {
    href: "/courses/ems-ce/course-material",
    label: "CE Course Material",
  },
  {
    href: "/courses/ems-ce/class-creation",
    label: "Class Creation",
  },
] as const;

export function EmsCeTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "rounded-lg bg-red-950/55 px-3 py-1.5 text-sm font-medium text-red-100 ring-1 ring-inset ring-red-800/55"
                : "rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900/70 hover:text-white"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
