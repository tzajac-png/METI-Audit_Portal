/** One roster row from the aligned instructors sheet, with a stable key for audits. */
export type AlignedInstructorRowSummary = {
  rowKey: string;
  displayLabel: string;
  firstName: string;
  lastName: string;
  /** From sheet: Course Date, Course Start Date, Class Date, or Timestamp */
  courseDateLabel: string;
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

/** Reject checkbox / yes-no columns mistaken for name fields (e.g. "FALSE", "TRUE"). */
export function isPlausiblePersonNameCellValue(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  if (/^(true|false|yes|no|y|n)$/i.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (/^[\d]{1,2}\/[\d]{1,2}\/[\d]{2,4}$/.test(t)) return false;
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  return true;
}

/**
 * Prefer specific headers (e.g. Candidate First Name) before generic "First name"
 * columns that may appear earlier in the sheet with boolean values.
 */
function findCellByPatternPriority(
  row: Record<string, string>,
  headers: string[],
  patterns: RegExp[],
  allowValue: (v: string) => boolean = isPlausiblePersonNameCellValue,
): string {
  for (const re of patterns) {
    for (const h of headers) {
      if (!re.test(h.trim())) continue;
      const v = (row[h] ?? "").trim();
      if (v && allowValue(v)) return v;
    }
  }
  return "";
}

function isNoiseNameHeader(header: string): boolean {
  return /boss|supervisor|your\s*boss|business\s*name|company\s*name|employer|training\s*center|facility|organization/i.test(
    header.trim(),
  );
}

/**
 * Match common instructor-roster / form sheet date columns.
 */
export function findCourseDateLabel(
  row: Record<string, string>,
  headers: string[],
): string {
  const fromHeader = findCell(row, headers, [
    /^course\s*date$/i,
    /^course\s*start\s*date$/i,
    /^class\s*date$/i,
    /^start\s*date$/i,
  ]);
  if (fromHeader) return fromHeader;
  for (const h of headers) {
    if (/^timestamp$/i.test(h.trim())) {
      const v = row[h]?.trim();
      if (v) return v;
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
  const firstCol = findCellByPatternPriority(row, headers, [
    /^candidate\s*first\s*name$/i,
    /^instructor\s*first\s*name$/i,
    /^first\s*name$/i,
    /^given\s*name$/i,
  ]);
  const lastCol = findCellByPatternPriority(row, headers, [
    /^candidate\s*last\s*name$/i,
    /^instructor\s*last\s*name$/i,
    /^last\s*name$/i,
    /^surname$/i,
    /^family\s*name$/i,
  ]);

  if (firstCol || lastCol) {
    const fullName = [firstCol, lastCol].filter(Boolean).join(" ").trim();
    return {
      firstName: firstCol,
      lastName: lastCol,
      fullName:
        fullName ||
        pickFullNameFallback(row, headers) ||
        "(Row)",
    };
  }

  const combined = findCellByPatternPriority(row, headers, [
    /^candidate\s*name$/i,
    /^full\s*name$/i,
    /^instructor\s*name$/i,
    /^name$/i,
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
    const ht = h.trim();
    if (isNoiseNameHeader(ht)) continue;
    if (/^candidate\s*name$/i.test(ht) || /^full\s*name$/i.test(ht)) {
      const v = row[h]?.trim();
      if (v && isPlausiblePersonNameCellValue(v)) return v;
    }
  }
  for (const h of headers) {
    const ht = h.trim();
    if (isNoiseNameHeader(ht)) continue;
    if (/name/i.test(ht)) {
      const v = row[h]?.trim();
      if (v && isPlausiblePersonNameCellValue(v)) return v;
    }
  }
  for (const h of headers) {
    const ht = h.trim();
    if (isNoiseNameHeader(ht)) continue;
    if (
      /candidate|instructor|applicant|respondent|your\s*name|student\s*name/i.test(
        ht,
      )
    ) {
      const v = row[h]?.trim();
      if (v && isPlausiblePersonNameCellValue(v)) return v;
    }
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
      courseDateLabel: findCourseDateLabel(row, headers),
      snapshot: Object.fromEntries(
        headers.map((h) => [h, (row[h] ?? "").trim()]),
      ),
    };
  });
}
