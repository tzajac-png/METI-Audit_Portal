"use client";

import { useState } from "react";
import Image from "next/image";

export default function DashboardLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Login failed.",
        );
        return;
      }
      // Full page load so the Set-Cookie from the API is applied before / runs in middleware
      window.location.assign("/");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0e] px-4">
      <div className="w-full max-w-md rounded-xl border border-red-900/40 bg-[var(--surface)] p-8 shadow-xl shadow-black/50">
        <div className="mb-0 flex justify-center">
          <Image
            src="/meti-logo.png"
            alt="METI"
            width={560}
            height={224}
            className="h-auto max-h-[11rem] w-auto max-w-[min(100%,28rem)] object-contain object-center mix-blend-lighten sm:max-h-[13rem] sm:max-w-[min(100%,32rem)]"
            priority
          />
        </div>
        <h1 className="mt-1 text-center text-xl font-semibold text-white">
          METI{" "}
          <span className="text-red-500">Course Portal</span>
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-400">
          Enter the portal password to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block" htmlFor="dash-password">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-red-400/90">
              Password
            </span>
            <input
              id="dash-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-red-900/40 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/60 focus:outline-none focus:ring-1 focus:ring-red-500/40"
              placeholder="Portal password"
              disabled={loading}
            />
          </label>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
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
