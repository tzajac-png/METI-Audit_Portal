import Image from "next/image";
import Link from "next/link";
import { DashboardSignOutButton } from "@/components/DashboardSignOutButton";

export function SiteHeader() {
  return (
    <header className="border-b border-red-900/35 bg-[#0c0c0e]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-0">
          <Link
            href="/"
            className="inline-block w-fit shrink-0 transition-opacity hover:opacity-95"
          >
            <Image
              src="/meti-logo.png"
              alt="Michigan Emergency Training Institute — METI"
              width={720}
              height={315}
              className="h-auto max-h-[10rem] w-auto max-w-[min(100%,34rem)] object-contain object-left mix-blend-lighten sm:max-h-[12rem] sm:max-w-[min(100%,38rem)] lg:max-h-[13rem] lg:max-w-[min(100%,42rem)]"
              priority
            />
          </Link>
          <div className="pt-0.5">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white"
            >
              METI{" "}
              <span className="text-red-500">Course Portal</span>
            </Link>
            <p className="text-sm text-zinc-400">
              BLS · ACLS · PALS · Heartsaver
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm sm:gap-6">
          <Link
            href="/"
            className="text-zinc-300 transition hover:text-white"
          >
            Dashboard
          </Link>
          <DashboardSignOutButton />
          <Link
            href="/aligned-instructors-admin"
            className="font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            Aligned Instructors Admin
          </Link>
          <Link
            href="/audit/courses"
            className="font-medium text-red-400 transition hover:text-red-300"
          >
            Admin Audit
          </Link>
        </nav>
      </div>
    </header>
  );
}
