import { AlignedInstructorCredentialFieldValue } from "@/components/AlignedInstructorCredentialFieldValue";
import { CandidateSubmissionHistoryTable } from "@/components/CandidateSubmissionHistoryTable";
import type { CandidateSubmission } from "@/lib/aha-alignment-candidate-helpers";
import type { NameHero } from "@/lib/aha-candidate-profile-layout";

type Section = {
  id: string;
  label: string;
  fields: {
    header: string;
    values: string[];
  }[];
};

type Props = {
  hero: NameHero;
  sections: Section[];
  submissions: CandidateSubmission[];
  /** Opens the credentials tab; edits are made in the sheet, not in the portal. */
  sheetEditUrl?: string;
};

export function CandidateProfileLayout({
  hero,
  sections,
  submissions,
  sheetEditUrl,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {sheetEditUrl ? (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            This page mirrors the spreadsheet. To change answers or uploads, edit
            the source row in Google Sheets.
          </p>
          <a
            href={sheetEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-2 text-center text-sm font-semibold text-red-200/95 transition hover:border-red-700 hover:bg-red-950/50"
          >
            Edit in spreadsheet
          </a>
        </div>
      ) : null}

      <header className="border-b border-zinc-800/90 pb-8">
        <p className="text-3xl font-normal tracking-tight text-white sm:text-[2.125rem] sm:leading-tight">
          {hero.primary}
        </p>
        {hero.secondary ? (
          <div className="mt-6">
            <p className="text-sm font-medium text-zinc-500">
              {hero.secondary.caption}
            </p>
            <p className="mt-1 text-xl font-normal tracking-tight text-zinc-100">
              {hero.secondary.value}
            </p>
          </div>
        ) : null}
      </header>

      {sections.map((section) => (
        <section key={section.id} className="scroll-mt-4">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            {section.label}
          </h2>
          <dl className="mt-6 divide-y divide-zinc-800/70">
            {section.fields.map((field) => (
              <div key={field.header} className="grid gap-2 py-7 first:pt-0">
                <dt className="text-sm font-medium text-zinc-500">
                  {field.header}
                </dt>
                <dd className="space-y-2 text-base leading-relaxed text-zinc-100">
                  {field.values.map((v, i) => (
                    <AlignedInstructorCredentialFieldValue key={i} value={v} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {submissions.length > 0 ? (
        <section className="scroll-mt-4">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            Course Submission History
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            One row per spreadsheet entry. Remove hides a row in this portal
            only.
          </p>
          <div className="mt-5">
            <CandidateSubmissionHistoryTable submissions={submissions} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
