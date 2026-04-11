/** One roster row from the aligned instructors sheet, with a stable key for audits. */
export type AlignedInstructorRowSummary = {
  rowKey: string;
  displayLabel: string;
  /** Column header → cell value (audit snapshot source) */
  snapshot: Record<string, string>;
};

function stableRowKeyFromParts(parts: string[]): string {
  const t = parts.join("|").slice(0, 400);
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) | 0;
  }
  return `aligned-${Math.abs(h).toString(36)}`;
}

function pickDisplayLabel(
  row: Record<string, string>,
  headers: string[],
): string {
  for (const h of headers) {
    if (/name/i.test(h.trim())) {
      const v = row[h]?.trim();
      if (v) return v;
    }
  }
  for (const h of headers) {
    const v = row[h]?.trim();
    if (v) return v;
  }
  return "(Row)";
}

export function buildAlignedInstructorRowSummaries(
  headers: string[],
  rows: Record<string, string>[],
): AlignedInstructorRowSummary[] {
  return rows.map((row) => {
    const parts = headers.map((h) => (row[h] ?? "").trim());
    return {
      rowKey: stableRowKeyFromParts(parts),
      displayLabel: pickDisplayLabel(row, headers),
      snapshot: Object.fromEntries(
        headers.map((h) => [h, (row[h] ?? "").trim()]),
      ),
    };
  });
}
