"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CandidateSubmission } from "@/lib/aha-alignment-candidate-helpers";
import { AlignedInstructorCredentialFieldValue } from "@/components/AlignedInstructorCredentialFieldValue";

type Props = {
  submissions: CandidateSubmission[];
};

export function CandidateSubmissionHistoryTable({ submissions }: Props) {
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
      <p className="text-sm text-zinc-500">No submission rows for this candidate.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
        <table className="min-w-full border-collapse text-left text-sm">
                   <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40 text-left text-xs font-semibold text-zinc-400">
              <th className="whitespace-nowrap px-4 py-3">Date</th>
              <th className="min-w-[10rem] px-4 py-3">Status</th>
              <th className="min-w-[12rem] px-4 py-3">Attachments</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/90 text-zinc-200">
            {submissions.map((s) => {
              const statusDisplay =
                [s.status, s.documentType].find((x) => x?.trim()) || "—";
              return (
                <tr key={s.rowKey} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {s.timestamp || "—"}
                  </td>
                  <td className="px-4 py-3">{statusDisplay}</td>
                  <td className="px-4 py-3">
                    {s.uploadUrl ? (
                      <AlignedInstructorCredentialFieldValue value={s.uploadUrl} />
                    ) : s.expiration ? (
                      <span className="text-zinc-500">{s.expiration}</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
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
                        className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-red-900/50 hover:text-red-300 disabled:opacity-50"
                      >
                        {busyKey === s.rowKey ? "…" : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
