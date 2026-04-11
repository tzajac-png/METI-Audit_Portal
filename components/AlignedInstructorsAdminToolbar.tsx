"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Header for the Aligned Instructors admin area only (not linked to course audit).
 */
export function AlignedInstructorsAdminToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isCredentials = pathname.startsWith(
    "/aligned-instructors-admin/credentials",
  );

  async function logout() {
    await fetch("/api/aligned-instructors-admin/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/aligned-instructors-admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-900/30 bg-zinc-950/80 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Aligned Instructors Admin
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            METI BLS AHA roster audits — password here or course audit sign-in.
            Auditors: Tyler Zajac or Ben Bonathan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-red-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
      <nav className="flex flex-wrap gap-1 border-t border-zinc-800/80 pt-3">
        <Link
          href="/aligned-instructors-admin"
          className={
            isCredentials
              ? "rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              : "rounded-md bg-red-950/50 px-3 py-1.5 text-sm font-medium text-red-200 ring-1 ring-red-800/40"
          }
        >
          Roster audit
        </Link>
        <Link
          href="/aligned-instructors-admin/credentials"
          className={
            isCredentials
              ? "rounded-md bg-red-950/50 px-3 py-1.5 text-sm font-medium text-red-200 ring-1 ring-red-800/40"
              : "rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          }
        >
          Candidates
        </Link>
      </nav>
    </div>
  );
}
