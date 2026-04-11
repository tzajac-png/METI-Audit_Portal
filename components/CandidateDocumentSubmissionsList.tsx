"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CandidateSubmission } from "@/lib/aha-alignment-candidate-helpers";
import { AlignedInstructorCredentialFieldValue } from "@/components/AlignedInstructorCredentialFieldValue";

type Props = {
  submissions: CandidateSubmission[];
};

export function CandidateDocumentSubmissionsList({ submissions }: Props) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeFromPortal(rowKey: string) {
    if (
      !confirm(
        "Remove this submission from the portal? The Google Sheet row and Drive file are not deleted.",
      )
    ) {
      return;
    }
    setBusyKey(rowKey);
    setError(null);
    try {
      const res = await fetch("/api/aligned-candidate-document-hides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowKey }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not hide submission.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusyKey(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No document submissions for this candidate (or all were removed from the
        portal).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950/40">
        {submissions.map((s) => (
          <li
            key={s.rowKey}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-white">
                {s.documentType || "Document"}
              </p>
              {s.expiration ? (
                <p className="text-xs text-zinc-500">
                  Expires: <span className="text-zinc-400">{s.expiration}</span>
                </p>
              ) : null}
              {s.timestamp ? (
                <p className="text-xs text-zinc-600">
                  Submitted: {s.timestamp}
                </p>
              ) : null}
              {s.uploadUrl ? (
                <div className="text-sm">
                  <span className="text-zinc-500">File: </span>
                  <AlignedInstructorCredentialFieldValue value={s.uploadUrl} />
                </div>
              ) : (
                <p className="text-xs text-zinc-600">No upload link in sheet.</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Link
                href={`/aligned-instructors-admin/credentials/${encodeURIComponent(s.rowKey)}`}
                className="text-xs text-zinc-500 underline hover:text-red-300"
              >
                Raw row
              </Link>
              <button
                type="button"
                disabled={busyKey === s.rowKey}
                onClick={() => void removeFromPortal(s.rowKey)}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-red-900/50 hover:text-red-300 disabled:opacity-50"
              >
                {busyKey === s.rowKey ? "Removing…" : "Remove from portal"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
