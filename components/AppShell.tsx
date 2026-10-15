"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "@/components/SideNav";

/** Login screens render standalone (no sidebar). */
const NO_NAV_ROUTES = new Set([
  "/login",
  "/audit/login",
  "/aligned-instructors-admin/login",
]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_NAV_ROUTES.has(pathname)) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <SideNav />
      <main className="mx-auto min-h-screen w-full min-w-0 max-w-[1600px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
