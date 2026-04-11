"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INSTRUCTOR_UPLOAD_OTHER,
  INSTRUCTOR_UPLOAD_SECTIONS,
} from "@/lib/instructor-upload-labels";
import type { InstructorFormSubmission } from "@/lib/instructor-form-submissions";
import { INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL } from "@/lib/instructor-upload-form";
import type {
  InstructorUploadCategory,
  InstructorUploadEntry,
} from "@/lib/instructor-uploads-store";
import { readApiErrorMessage } from "@/lib/read-api-error";

type Props = {
  instructorId: string;
  /** Submissions from the Google Form / sheet tab, grouped by mapped document type */
  formSubmissionsByCategory?: Partial<
    Record<InstructorUploadCategory, InstructorFormSubmission[]>
  >;
  /** Form rows whose Document Type did not match a portal category */
  formSubmissionsUnmapped?: InstructorFormSubmission[];
};

type UploadMap = Partial<
  Record<InstructorUploadCategory, InstructorUploadEntry[]>
>;

type ExpirationMap = Partial<
  Record<InstructorUploadCategory, string | null>
>;

const navLinks = [
  ...INSTRUCTOR_UPLOAD_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
  { id: "other", label: "Other" },
];

function formatFormTimestamp(raw: string): string {
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  return raw || "—";
}

function FormSubmissionLog({
  entries,
  heading,
}: {
  entries: InstructorFormSubmission[];
  /** Omit or pass null to hide the label (e.g. unmapped section has its own title). */
  heading?: string | null;
}) {
  if (entries.length === 0) return null;
  return (
    <div
      className={
        heading
          ? "mt-4 border-t border-zinc-800/80 pt-3"
          : "mt-2 border-t border-zinc-800/80 pt-3"
      }
    >
      {heading ? (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {heading}
        </p>
      ) : null}
      <ul className={heading ? "mt-2 space-y-2 text-xs" : "space-y-2 text-xs"}>
        {entries.map((s) => (
          <li
            key={s.id}
            className="rounded-md border border-zinc-800/60 bg-black/20 px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a
                href={s.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-red-400/95 hover:text-red-300"
              >
                Open document
              </a>
              <span className="text-zinc-500">
                {formatFormTimestamp(s.timestamp)}
              </span>
            </div>
            <p className="mt-1 text-zinc-500">
              Type:{" "}
              <span className="text-zinc-400">{s.documentType}</span>
              {s.expirationDate ? (
                <>
                  {" "}
                  · Expires:{" "}
                  <span className="text-zinc-400">{s.expirationDate}</span>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InstructorDocumentUploads({
  instructorId,
  formSubmissionsByCategory = {},
  formSubmissionsUnmapped = [],
}: Props) {
  const [uploads, setUploads] = useState<UploadMap>({});
  const [expirations, setExpirations] = useState<ExpirationMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savingExp, setSavingExp] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/instructor-uploads?instructorId=${encodeURIComponent(instructorId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(
          await readApiErrorMessage(res, "Failed to load uploads"),
        );
      }
      const data = (await res.json()) as {
        uploads: UploadMap;
        expirations: ExpirationMap;
      };
      setUploads(data.uploads ?? {});
      setExpirations(data.expirations ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(
    category: InstructorUploadCategory,
    file: File | null,
  ) {
    if (!file || file.size === 0) return;
    setBusyKey(category);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("instructorId", instructorId);
      fd.set("category", category);
      fd.set("file", file);
      const res = await fetch("/api/instructor-uploads", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, "Upload failed"));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveExpiration(
    category: InstructorUploadCategory,
    expirationDate: string | null,
  ) {
    setSavingExp(category);
    setError(null);
    try {
      const res = await fetch("/api/instructor-uploads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          instructorId,
          category,
          expirationDate: expirationDate?.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error(
          await readApiErrorMessage(res, "Could not save date"),
        );
      }
      setExpirations((prev) => ({
        ...prev,
        [category]: expirationDate?.trim() || null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save date");
    } finally {
      setSavingExp(null);
    }
  }

  function downloadHref(entryId: string): string {
    const q = new URLSearchParams({
      instructorId,
      entryId,
    });
    return `/api/instructor-uploads/download?${q.toString()}`;
  }

  async function onDelete(entryId: string, fileLabel: string) {
    if (
      !window.confirm(
        `Delete “${fileLabel}” from this list? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(entryId);
    setError(null);
    try {
      const q = new URLSearchParams({ instructorId, entryId });
      const res = await fetch(`/api/instructor-uploads?${q.toString()}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, "Delete failed"));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function expirationBadge(iso: string | null | undefined) {
    if (!iso) return null;
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 60);
    const expired = d < now;
    const warn = !expired && d < soon;
    return (
      <span
        className={
          expired
            ? "text-red-400"
            : warn
              ? "text-amber-400"
              : "text-zinc-500"
        }
      >
        Expires {d.toLocaleDateString()}
        {expired ? " (past)" : ""}
      </span>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">Loading document uploads…</p>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <p className="rounded-lg border border-emerald-900/35 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90">
        <span className="font-medium text-emerald-200">Primary:</span> instructors
        submit documents through the{" "}
        <a
          href={INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-red-400 underline hover:text-red-300"
        >
          Google Form
        </a>
        . Links appear below by document type. Optional portal uploads are for
        legacy or admin-only files.
      </p>

      <nav
        aria-label="Document sections"
        className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-zinc-800/80 bg-[var(--surface)] pb-3 pt-1"
      >
        {navLinks.map((l) => (
          <a
            key={l.id}
            href={`#instructor-docs-${l.id}`}
            className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-red-800/50 hover:text-white"
          >
            {l.label}
          </a>
        ))}
      </nav>

      {INSTRUCTOR_UPLOAD_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={`instructor-docs-${section.id}`}
          className="scroll-mt-28 rounded-xl border border-red-900/25 bg-zinc-950/30 p-5"
        >
          <h3 className="text-base font-semibold tracking-wide text-red-400/95">
            {section.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Google Form submissions mapped to this program appear in each log below.
            Portal-only expiration dates apply to manual uploads.
          </p>
          <div className="mt-5 space-y-5">
            {section.items.map(({ key, label }) => {
              const list = uploads[key] ?? [];
              const exp = expirations[key] ?? null;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {label}
                      </h4>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <label className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="shrink-0">Expiration</span>
                          <input
                            type="date"
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white"
                            value={exp ?? ""}
                            onChange={(e) =>
                              setExpirations((prev) => ({
                                ...prev,
                                [key]: e.target.value || null,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          disabled={savingExp === key}
                          onClick={() => saveExpiration(key, exp ?? null)}
                          className="w-fit rounded border border-red-800/50 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-950/70 disabled:opacity-50"
                        >
                          {savingExp === key ? "Saving…" : "Save date"}
                        </button>
                        <span className="text-xs">{expirationBadge(exp)}</span>
                      </div>
                    </div>
                    <label className="shrink-0 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white">
                      {busyKey === key ? "Uploading…" : "Manual upload"}
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                        disabled={busyKey !== null || deletingId !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          void onUpload(key, f);
                        }}
                      />
                    </label>
                  </div>
                  <FormSubmissionLog
                    entries={formSubmissionsByCategory[key] ?? []}
                    heading="Google Form log (this document type)"
                  />
                  {list.length === 0 ? (
                    <p className="mt-3 text-xs text-zinc-600">
                      No manual portal uploads.
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-500">
                        Manual portal uploads
                      </p>
                      <ul className="mt-2 space-y-2 text-xs">
                        {list.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex flex-wrap items-start justify-between gap-2 border-t border-zinc-800/80 pt-2 first:border-t-0 first:pt-0"
                          >
                            <div className="min-w-0 flex-1">
                              <a
                                href={downloadHref(entry.id)}
                                className="break-all text-red-400/95 hover:text-red-300"
                              >
                                {entry.originalName}
                              </a>
                              <span className="mt-0.5 block text-zinc-500">
                                {new Date(entry.uploadedAt).toLocaleString()}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={busyKey !== null || deletingId !== null}
                              onClick={() =>
                                void onDelete(entry.id, entry.originalName)
                              }
                              className="shrink-0 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-red-800/60 hover:bg-red-950/50 hover:text-red-200 disabled:opacity-50"
                            >
                              {deletingId === entry.id ? "Deleting…" : "Delete"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section
        id="instructor-docs-other"
        className="scroll-mt-28 rounded-xl border border-zinc-800/90 bg-zinc-950/30 p-5"
      >
        <h3 className="text-base font-semibold text-white">Other documents</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Agreements, monitoring, applications, and paperwork log — plus form
          submissions that could not be matched to a category above.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {INSTRUCTOR_UPLOAD_OTHER.map(({ key, label, isLog }) => {
            const list = uploads[key] ?? [];
            return (
              <div
                key={key}
                className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{label}</h4>
                    {isLog ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Multiple files allowed (newest last).
                      </p>
                    ) : null}
                  </div>
                  <label className="shrink-0 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white">
                    {busyKey === key ? "Uploading…" : "Manual upload"}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                      disabled={busyKey !== null || deletingId !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onUpload(key, f);
                      }}
                    />
                  </label>
                </div>
                <FormSubmissionLog
                  entries={formSubmissionsByCategory[key] ?? []}
                  heading="Google Form log (this document type)"
                />
                {list.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-600">
                    No manual portal uploads.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-xs font-medium text-zinc-500">
                      Manual portal uploads
                    </p>
                    <ul className="mt-2 space-y-2 text-xs">
                      {list.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-start justify-between gap-2 border-t border-zinc-800/80 pt-2 first:border-t-0 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <a
                              href={downloadHref(entry.id)}
                              className="break-all text-red-400/95 hover:text-red-300"
                            >
                              {entry.originalName}
                            </a>
                            <span className="mt-0.5 block text-zinc-500">
                              {new Date(entry.uploadedAt).toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={busyKey !== null || deletingId !== null}
                            onClick={() =>
                              void onDelete(entry.id, entry.originalName)
                            }
                            className="shrink-0 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-red-800/60 hover:bg-red-950/50 hover:text-red-200 disabled:opacity-50"
                          >
                            {deletingId === entry.id ? "Deleting…" : "Delete"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {formSubmissionsUnmapped.length > 0 ? (
          <div className="mt-6 rounded-lg border border-amber-900/40 bg-amber-950/15 p-4">
            <h4 className="text-sm font-semibold text-amber-200/95">
              Form submissions — unmapped document type
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              These rows matched this instructor but the Document Type text did not
              match a folder above. Adjust the form options or ask your admin to
              extend the type map.
            </p>
            <FormSubmissionLog entries={formSubmissionsUnmapped} heading={null} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
