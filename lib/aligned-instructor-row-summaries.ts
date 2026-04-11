/** One roster row from the aligned instructors sheet, with a stable key for audits. */
export type AlignedInstructorRowSummary = {
  rowKey: string;
  displayLabel: string;
  firstName: string;
  lastName: string;
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

function findCell(
  row: Record<string, string>,
  headers: string[],
  patterns: RegExp[],
): string {
  for (const h of headers) {
    const ht = h.trim();
    for (const re of patterns) {
      if (re.test(ht)) {
        const v = row[h]?.trim();
        if (v) return v;
      }
    }
  }
  return "";
}

/**
 * Prefer explicit First / Last columns; else split a single Name column.
 */
export function parseFirstLastName(
  row: Record<string, string>,
  headers: string[],
): { firstName: string; lastName: string; fullName: string } {
  const firstCol = findCell(row, headers, [
    /^instructor\s*first\s*name$/i,
    /^first\s*name$/i,
    /^first$/i,
    /^given\s*name$/i,
  ]);
  const lastCol = findCell(row, headers, [
    /^instructor\s*last\s*name$/i,
    /^last\s*name$/i,
    /^last$/i,
    /^surname$/i,
    /^family\s*name$/i,
  ]);

  if (firstCol || lastCol) {
    const fullName = [firstCol, lastCol].filter(Boolean).join(" ").trim();
    return {
      firstName: firstCol,
      lastName: lastCol,
      fullName: fullName || pickFullNameFallback(row, headers),
    };
  }

  const combined = findCell(row, headers, [
    /^full\s*name$/i,
    /^name$/i,
    /^instructor\s*name$/i,
    /instructor/i,
  ]);
  if (combined) {
    const parts = combined.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0] ?? "", lastName: "", fullName: combined };
    }
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      fullName: combined,
    };
  }

  const fallback = pickFullNameFallback(row, headers);
  const parts = fallback.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    fullName: fallback,
  };
}

function pickFullNameFallback(
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
    const { firstName, lastName, fullName } = parseFirstLastName(row, headers);
    return {
      rowKey: stableRowKeyFromParts(parts),
      displayLabel: fullName,
      firstName,
      lastName,
      snapshot: Object.fromEntries(
        headers.map((h) => [h, (row[h] ?? "").trim()]),
      ),
    };
  });
}
