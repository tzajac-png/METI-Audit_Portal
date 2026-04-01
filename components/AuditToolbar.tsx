"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AuditToolbar() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/audit/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/audit/login");
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={
          active
            ? "font-medium text-white"
            : "text-zinc-400 transition hover:text-white"
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-900/30 bg-zinc-950/80 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <p className="text-zinc-400">
          Signed in to <span className="text-red-400">audit</span> mode
        </p>
        <nav className="flex flex-wrap gap-4 border-l border-zinc-800 pl-4">
          {link("/audit/courses", "Course audits")}
        </nav>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-red-800 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
