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
};

export function CandidateProfileLayout({
  hero,
  sections,
  submissions,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="border-b border-zinc-800/90 pb-8">
        <p className="text-3xl font-light tracking-tight text-white sm:text-4xl">
          {hero.primary}
        </p>
        {hero.secondary ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {hero.secondary.caption}
            </p>
            <p className="mt-1.5 text-xl font-normal text-zinc-100">
              {hero.secondary.value}
            </p>
          </div>
        ) : null}
      </header>

      {sections.map((section) => (
        <section key={section.id} className="scroll-mt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {section.label}
          </h2>
          <dl className="mt-5 space-y-6">
            {section.fields.map((field) => (
              <div key={field.header}>
                <dt className="text-sm leading-snug text-zinc-500">
                  {field.header}
                </dt>
                <dd className="mt-1.5 space-y-2 text-base leading-relaxed text-zinc-100">
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
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Course Submission History
          </h2>
          <p className="mt-2 text-xs text-zinc-600">
            One row per spreadsheet entry. Remove hides a row in this portal only.
          </p>
          <div className="mt-4">
            <CandidateSubmissionHistoryTable submissions={submissions} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
