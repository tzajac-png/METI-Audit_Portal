"use client";

import {
  INSTRUCTOR_UPLOAD_OTHER,
  INSTRUCTOR_UPLOAD_SECTIONS,
} from "@/lib/instructor-upload-labels";
import type { InstructorFormSubmission } from "@/lib/instructor-form-submissions";
import { INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL } from "@/lib/instructor-upload-form";
import type { InstructorUploadCategory } from "@/lib/instructor-uploads-store";

type Props = {
  /** Submissions from the Google Form / sheet tab, grouped by mapped document type */
  formSubmissionsByCategory?: Partial<
    Record<InstructorUploadCategory, InstructorFormSubmission[]>
  >;
  /** Form rows whose Document Type did not match a portal category */
  formSubmissionsUnmapped?: InstructorFormSubmission[];
};

const navLinks = [
  ...INSTRUCTOR_UPLOAD_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
  { id: "other", label: "Other" },
];

function formatFormTimestamp(raw: string): string {
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  return raw || "—";
}

/** Parse sheet/form expiration strings (e.g. 7/31/2026, YYYY-MM-DD). */
function parseFormExpiration(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t.slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (us) {
    const m = parseInt(us[1], 10);
    const day = parseInt(us[2], 10);
    const y = parseInt(us[3], 10);
    const d = new Date(y, m - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ExpirationStatus({ raw }: { raw: string }) {
  const d = parseFormExpiration(raw);
  if (!d) {
    return (
      <span className="text-xs text-zinc-500">
        (Could not parse date; showing raw value.)
      </span>
    );
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 60);
  const expired = cmp < now;
  const warn = !expired && cmp < soon;
  return (
    <span
      className={
        expired
          ? "text-xs text-red-400"
          : warn
            ? "text-xs text-amber-400"
            : "text-xs text-zinc-500"
      }
    >
      {expired
        ? "Expired"
        : warn
          ? "Expiring within 60 days"
          : "Active"}
      {" · "}
      {d.toLocaleDateString()}
    </span>
  );
}

function FormSubmissionLog({
  entries,
  heading,
}: {
  entries: InstructorFormSubmission[];
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
  formSubmissionsByCategory = {},
  formSubmissionsUnmapped = [],
}: Props) {
  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-emerald-900/35 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90">
        Documents are submitted through the{" "}
        <a
          href={INSTRUCTOR_DOCUMENT_GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-red-400 underline hover:text-red-300"
        >
          Google Form
        </a>
        . Entries below are from the responses sheet, newest first. For BLS /
        ACLS / PALS credentials, expiration reflects the{" "}
        <span className="font-medium text-emerald-200">most recent</span> filing
        for that document type.
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
            Google Form submissions for this program. Credential expiration shown
            here matches the latest submission in each category.
          </p>
          <div className="mt-5 space-y-5">
            {section.items.map(({ key, label }) => {
              const formList = formSubmissionsByCategory[key] ?? [];
              const latest = formList[0];
              const latestExp = latest?.expirationDate?.trim() ?? "";

              return (
                <div
                  key={key}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-4"
                >
                  <h4 className="text-sm font-medium text-white">{label}</h4>
                  <div className="mt-3 rounded-md border border-zinc-800/70 bg-black/15 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500">
                      Expiration (latest form filing)
                    </p>
                    <p className="mt-1 text-sm text-zinc-200">
                      {latestExp || "—"}
                    </p>
                    {latestExp ? (
                      <div className="mt-1">
                        <ExpirationStatus raw={latestExp} />
                      </div>
                    ) : null}
                  </div>
                  {formList.length === 0 ? (
                    <p className="mt-3 text-xs text-zinc-600">
                      No form submissions for this type yet.
                    </p>
                  ) : (
                    <FormSubmissionLog
                      entries={formList}
                      heading="Submission log"
                    />
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
          {INSTRUCTOR_UPLOAD_OTHER.map(({ key, label }) => {
            const formList = formSubmissionsByCategory[key] ?? [];
            return (
              <div
                key={key}
                className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-4"
              >
                <h4 className="text-sm font-medium text-white">{label}</h4>
                {formList.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-600">
                    No form submissions for this type yet.
                  </p>
                ) : (
                  <FormSubmissionLog
                    entries={formList}
                    heading="Submission log"
                  />
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
              These rows matched this instructor but the Document Type text did
              not match a folder above. Adjust the form options or extend the
              type map in code.
            </p>
            <FormSubmissionLog entries={formSubmissionsUnmapped} heading={null} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
