"use client";

import { useState } from "react";

export default function AlignedInstructorsAdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/aligned-instructors-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      window.location.assign("/aligned-instructors-admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="rounded-xl border border-red-900/40 bg-[var(--surface)] p-8 shadow-xl shadow-black/50">
        <h1 className="text-xl font-semibold text-white">
          Aligned Instructors Admin
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with the aligned-instructors password to manage roster audits.
          If you already use <span className="text-zinc-300">Admin Audit</span>,
          you can open{" "}
          <span className="text-zinc-300">Aligned Instructors Admin</span>{" "}
          directly without signing in here again.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2.5 text-white focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
