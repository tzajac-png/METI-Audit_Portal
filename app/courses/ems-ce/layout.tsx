import Link from "next/link";
import { EmsCeTabs } from "@/components/EmsCeTabs";

export default function EmsCeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            EMS CE <span className="text-red-500">Course</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">
            Track CEs submitted to the state, store course materials, and create
            classes with paperwork for course tracking.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm text-red-400 hover:text-red-300"
        >
          ← Dashboard
        </Link>
      </div>
      <EmsCeTabs />
      {children}
    </div>
  );
}
