"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  courseCode: string;
  programTitle: string;
  dateLabel: string;
  location: string;
  leadInstructor: string;
  auditComplete: boolean;
};

type Status = {
  requested: boolean;
  requestedAt: string | null;
  auditComplete: boolean;
};

export function RequestCourseAuditButton({
  courseCode,
  programTitle,
  dateLabel,
  location,
  leadInstructor,
  auditComplete,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/course-audit-requests?courseCode=${encodeURIComponent(courseCode)}`,
        { credentials: "include" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as Status;
      setStatus(json);
    } catch {
      /* ignore */
    }
  }, [courseCode]);

  useEffect(() => {
    if (auditComplete) return;
    void refresh();
  }, [auditComplete, refresh]);

  async function onRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/course-audit-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode,
          programTitle,
          courseDateLabel: dateLabel,
          courseLocation: location,
          leadInstructor,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not submit audit request.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not submit audit request.");
    } finally {
      setBusy(false);
    }
  }

  if (auditComplete || status?.auditComplete) return null;

  if (status?.requested) {
    return (
      <span
        className="rounded-lg border border-sky-800/50 bg-sky-950/35 px-4 py-2 text-sm text-sky-100/95"
        title={
          status.requestedAt
            ? `Requested ${new Date(status.requestedAt).toLocaleString()}`
            : undefined
        }
      >
        Audit requested
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void onRequest()}
        disabled={busy}
        className="rounded-lg border border-sky-700/60 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-500/60 hover:bg-sky-950/65 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Request audit"}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
