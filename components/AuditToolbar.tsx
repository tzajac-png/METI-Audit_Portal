"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const METI_BLS_PATH = "/audit/meti-bls-instructors";
const METI_BLS_LOGIN = "/audit/meti-bls-instructors/login";
const CERT_PATH = "/audit/courses/instructor-certifications";

type SessionMode = "audit" | "meti_bls";

type Props = {
  /** Use `meti_bls` when the user only signed in via METI BLS roster password. */
  sessionMode?: SessionMode;
};

export function AuditToolbar({ sessionMode = "audit" }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    if (sessionMode === "meti_bls") {
      await fetch("/api/audit/meti-bls-admin/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push(METI_BLS_LOGIN);
    } else {
      await fetch("/api/audit/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/audit/login");
    }
    router.refresh();
  }

  const link = (href: string, label: string) => {
    let active = false;
    if (href === METI_BLS_PATH) {
      active =
        pathname === METI_BLS_PATH ||
        (pathname.startsWith(`${METI_BLS_PATH}/`) &&
          !pathname.startsWith(METI_BLS_LOGIN));
    } else if (href === "/audit/courses") {
      active =
        pathname === "/audit/courses" ||
        (pathname.startsWith("/audit/courses/") &&
          !pathname.startsWith(CERT_PATH));
    } else if (href === CERT_PATH) {
      active = pathname.startsWith(CERT_PATH);
    } else {
      active = pathname === href;
    }
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

  const modeLabel =
    sessionMode === "meti_bls" ? (
      <>
        Signed in to <span className="text-red-400">METI BLS roster</span>
      </>
    ) : (
      <>
        Signed in to <span className="text-red-400">audit</span> mode
      </>
    );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-900/30 bg-zinc-950/80 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <p className="text-zinc-400">{modeLabel}</p>
        <nav className="flex flex-wrap gap-4 border-l border-zinc-800 pl-4">
          {link(METI_BLS_PATH, "METI BLS instructors")}
          {link("/audit/courses", "Course audits")}
          {link(CERT_PATH, "Instructor certifications")}
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
