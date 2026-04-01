"use client";

export function DashboardSignOutButton() {
  async function handleClick() {
    await fetch("/api/dashboard/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-zinc-400 transition hover:text-white"
    >
      Sign Out
    </button>
  );
}
