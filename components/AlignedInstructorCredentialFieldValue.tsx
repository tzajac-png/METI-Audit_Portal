/** Renders a sheet cell; URLs become external links. */
export function AlignedInstructorCredentialFieldValue({
  value,
}: {
  value: string;
}) {
  const t = value.trim();
  if (!t) return <span className="text-zinc-500">—</span>;
  if (/^https?:\/\//i.test(t)) {
    return (
      <a
        href={t}
        target="_blank"
        rel="noopener noreferrer"
        className="text-red-400/90 underline hover:text-red-300"
      >
        {t.length > 80 ? `${t.slice(0, 77)}…` : t}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{t}</span>;
}
