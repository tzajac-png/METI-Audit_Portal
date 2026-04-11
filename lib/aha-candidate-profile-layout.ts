import { isOmittedFromCredentialsDetailCell } from "@/lib/aligned-instructors-credentials-detail-filter";

export type MergedCandidateField = {
  header: string;
  values: string[];
  sourceRowKeys: string[];
};

export type NameHero = {
  primary: string;
  secondary?: { caption: string; value: string };
  excludeHeaders: Set<string>;
};

function isNoiseCellValue(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (!t) return true;
  if (t === "n/a" || t === "na") return true;
  if (t === "drop files here or browse") return true;
  if (/^browse$/i.test(t)) return true;
  return false;
}

export function mergeCandidateSheetFields(
  keyedRows: { row: Record<string, string>; rowKey: string }[],
  headers: string[],
): MergedCandidateField[] {
  const map = new Map<
    string,
    { values: string[]; rowKeys: Set<string>; seen: Set<string> }
  >();

  for (const { row, rowKey } of keyedRows) {
    for (const h of headers) {
      const v = (row[h] ?? "").trim();
      if (isOmittedFromCredentialsDetailCell(h, v)) continue;
      if (isNoiseCellValue(v)) continue;
      let ent = map.get(h);
      if (!ent) {
        ent = { values: [], rowKeys: new Set(), seen: new Set() };
        map.set(h, ent);
      }
      ent.rowKeys.add(rowKey);
      if (!ent.seen.has(v)) {
        ent.seen.add(v);
        ent.values.push(v);
      }
    }
  }

  return [...map.entries()].map(([header, { values, rowKeys }]) => ({
    header,
    values,
    sourceRowKeys: [...rowKeys],
  }));
}

function mergedValueForHeaderPattern(
  merged: MergedCandidateField[],
  re: RegExp,
): { header: string; value: string } | null {
  for (const m of merged) {
    if (re.test(m.header.trim()) && m.values[0]) {
      return { header: m.header, value: m.values[0]! };
    }
  }
  return null;
}

export function buildCandidateNameHero(
  merged: MergedCandidateField[],
  displayNameFallback: string,
): NameHero {
  const excludeHeaders = new Set<string>();

  const first =
    mergedValueForHeaderPattern(
      merged,
      /candidate.*first\s*name|^first\s*name$/i,
    ) ||
    mergedValueForHeaderPattern(merged, /^instructor\s*first\s*name$/i);
  const last =
    mergedValueForHeaderPattern(
      merged,
      /candidate.*last\s*name|^last\s*name$/i,
    ) ||
    mergedValueForHeaderPattern(merged, /^instructor\s*last\s*name$/i);
  const instructor = mergedValueForHeaderPattern(
    merged,
    /^instructor\s*name$/i,
  );

  if (first && last) {
    excludeHeaders.add(first.header);
    excludeHeaders.add(last.header);
    return {
      primary: first.value,
      secondary: { caption: last.header, value: last.value },
      excludeHeaders,
    };
  }

  if (instructor?.value) {
    excludeHeaders.add(instructor.header);
    const parts = instructor.value.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        primary: parts[0]!,
        secondary: {
          caption: "Candidate Last Name",
          value: parts.slice(1).join(" "),
        },
        excludeHeaders,
      };
    }
    return {
      primary: instructor.value,
      excludeHeaders,
    };
  }

  return {
    primary: displayNameFallback,
    excludeHeaders,
  };
}

export type ProfileSectionId =
  | "instructor_information"
  | "required_certs"
  | "documents"
  | "dates"
  | "monitor_paperwork"
  | "submission_meta"
  | "other";

const SECTION_ORDER: ProfileSectionId[] = [
  "instructor_information",
  "required_certs",
  "documents",
  "dates",
  "monitor_paperwork",
  "submission_meta",
  "other",
];

const SECTION_LABELS: Record<ProfileSectionId, string> = {
  instructor_information: "Instructor Information",
  required_certs: "Required Certs",
  documents: "Documents & uploads",
  dates: "Dates",
  monitor_paperwork: "Monitor paperwork",
  submission_meta: "Submission details",
  other: "Additional fields",
};

/** Order fields like the source sheet (left-to-right column order). */
function sortMergedByHeaderOrder(
  fields: MergedCandidateField[],
  headers: string[],
): MergedCandidateField[] {
  const idx = new Map<string, number>();
  headers.forEach((h, i) => {
    if (!idx.has(h)) idx.set(h, i);
  });
  return [...fields].sort((a, b) => {
    const ia = idx.has(a.header) ? idx.get(a.header)! : 99999;
    const ib = idx.has(b.header) ? idx.get(b.header)! : 99999;
    if (ia !== ib) return ia - ib;
    return a.header.localeCompare(b.header);
  });
}

export function profileSectionForHeader(header: string): ProfileSectionId {
  const t = header.trim();
  if (/^timestamp$/i.test(t)) return "submission_meta";

  if (
    /monitor\s*paperwork|instructor\s*application|initial\s*monitoring|instructor\s*monitoring/i.test(
      t,
    )
  ) {
    return "monitor_paperwork";
  }

  if (
    /email|telephone|phone|contact\s*sheet|business\s*name|boss|supervisor|square\s*account|card\s*on\s*file|ecard|paying|responsible\s*for/i.test(
      t,
    )
  ) {
    return "instructor_information";
  }

  if (
    /required\s*certs?|instructor\s*essentials|instructor\s*card|already\s*certified/i.test(
      t,
    ) &&
    !/upload|file\s*link|\.pdf$/i.test(t)
  ) {
    return "required_certs";
  }

  if (
    /resume|cv|contract|signed|application|upload|attachment|file|\.pdf|drop\s*files|student_ecard|ecard\s*\(/i.test(
      t,
    ) ||
    /bls\s*cert|acls\s*cert|pals\s*cert/i.test(t)
  ) {
    return "documents";
  }

  if (/expiration|date\s*format|mm\/dd|yyyy/i.test(t)) {
    return "dates";
  }

  if (/document\s*type|submission|response/i.test(t)) {
    return "submission_meta";
  }

  return "other";
}

export function groupMergedFieldsBySection(
  merged: MergedCandidateField[],
  excludeHeaders: Set<string>,
  headers: string[],
): { id: ProfileSectionId; label: string; fields: MergedCandidateField[] }[] {
  const buckets = new Map<ProfileSectionId, MergedCandidateField[]>();
  for (const id of SECTION_ORDER) buckets.set(id, []);

  for (const field of merged) {
    if (excludeHeaders.has(field.header)) continue;
    const id = profileSectionForHeader(field.header);
    buckets.get(id)!.push(field);
  }

  return SECTION_ORDER.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    fields: sortMergedByHeaderOrder(buckets.get(id) ?? [], headers),
  })).filter((s) => s.fields.length > 0);
}
