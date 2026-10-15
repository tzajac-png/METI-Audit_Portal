"use client";

export function DashboardSignOutButton({
  className,
}: {
  className?: string;
}) {
  async function handleClick() {
    await fetch("/api/dashboard/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className ?? "text-zinc-200 transition hover:text-white"}
    >
      Sign Out
    </button>
  );
}
