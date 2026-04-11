import Link from "next/link";
import { AuditToolbar } from "@/components/AuditToolbar";
import {
  AUDIT_CERT_COLUMNS,
  buildInstructorCertExpirationOverview,
  certExpirationTone,
  type CertExpirationTone,
} from "@/lib/instructor-cert-expiration-overview";

export const dynamic = "force-dynamic";

function toneClass(tone: CertExpirationTone): string {
  switch (tone) {
    case "empty":
      return "text-zinc-600";
    case "invalid":
      return "text-zinc-400";
    case "expired":
      return "text-red-400 font-medium";
    case "soon":
      return "text-amber-300 font-medium";
    case "ok":
      return "text-zinc-300";
    default:
      return "text-zinc-300";
  }
}

export default async function AuditInstructorCertificationsPage() {
  const {
    rows,
    directoryFetchedAt,
    formFetchedAt,
    formError,
  } = await buildInstructorCertExpirationOverview();

  return (
    <div className="space-y-4">
      <AuditToolbar />
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Instructor certifications
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Latest expiration from the instructor document form for each credential
          type (same rules as the instructor directory detail page). Rows are
          ordered by the soonest parsed expiration across these columns.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Roster refreshed{" "}
          {new Date(directoryFetchedAt).toLocaleString()}
          {formFetchedAt ? (
            <>
              {" "}
              · Form sheet refreshed {new Date(formFetchedAt).toLocaleString()}
            </>
          ) : null}
        </p>
      </div>

      {formError ? (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          <p className="font-medium text-amber-100">
            Form responses could not be loaded
          </p>
          <p className="mt-1 text-amber-200/80">{formError}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Roster names still appear below; certification cells stay empty until
            the sheet loads.
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-red-900/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">
          All instructors — credential expirations
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="text-red-400">Red</span> = expired,{" "}
          <span className="text-amber-300">amber</span> = expires within 60 days.
          Instructor names link to the main portal directory (dashboard sign-in may
          be required in addition to audit mode).
        </p>

        {rows.length === 0 ? (
          <p className="mt-6 text-zinc-500">No instructors in the roster tab.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-red-900/35 text-zinc-400">
                  <th className="sticky left-0 z-[1] whitespace-nowrap bg-[var(--surface)] px-3 py-2 font-semibold">
                    Instructor
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">
                    Email
                  </th>
                  {AUDIT_CERT_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap px-3 py-2 font-semibold"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((row) => (
                  <tr key={row.instructorId} className="text-zinc-300">
                    <td className="sticky left-0 z-[1] bg-[var(--surface)] px-3 py-2 font-medium text-white">
                      <Link
                        href={`/courses/instructor-directory/${encodeURIComponent(row.instructorId)}`}
                        className="text-red-400/90 hover:text-red-300 hover:underline"
                      >
                        {row.displayName}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-xs text-zinc-400">
                      {row.email || "—"}
                    </td>
                    {AUDIT_CERT_COLUMNS.map((c) => {
                      const raw = row.byCategory[c.key];
                      const { tone, display } = certExpirationTone(raw);
                      return (
                        <td
                          key={c.key}
                          className={`whitespace-nowrap px-3 py-2 ${toneClass(tone)}`}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
