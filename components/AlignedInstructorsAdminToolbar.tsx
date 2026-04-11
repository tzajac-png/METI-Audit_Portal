"use client";

import { useRouter } from "next/navigation";

/**
 * Header for the Aligned Instructors admin area only (not linked to course audit).
 */
export function AlignedInstructorsAdminToolbar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/aligned-instructors-admin/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/aligned-instructors-admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-900/30 bg-zinc-950/80 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
  );
}
