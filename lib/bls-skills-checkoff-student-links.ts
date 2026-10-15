import type { StudentRow } from "@/lib/student-roster";
import type { StudentResourceLinks } from "@/lib/student-links";

/** Column N (1-based 14) = index 13 — online certificate upload. */
export const BLS_SKILLS_CHECK_CERTIFICATE_COLUMN_INDEX = 13;
/** Column BD (1-based 56) = index 55 — Skill Sheet Google Drive link. */
export const BLS_SKILLS_CHECK_SKILLS_COLUMN_INDEX = 55;
/** Column AK (1-based 37) = index 36 — Evaluations Google Drive link. */
export const BLS_SKILLS_CHECK_EVALUATION_COLUMN_INDEX = 36;

const CERTIFICATE_HEADER = "Upload a copy of your Online Certificate";

function isHttpUrl(val: string): boolean {
  return /^https?:\/\//i.test(val.trim());
}

function parseHyperlinkFormula(text: string): string {
  const m = text.match(/HYPERLINK\s*\(\s*"((?:[^"\\]|\\.)*)"/i);
  if (!m?.[1]) return "";
  const url = m[1].replace(/\\"/g, '"').trim();
  return isHttpUrl(url) ? url : "";
}

function cellLinkValue(val: string | undefined): string {
  const t = (val ?? "").trim();
  if (!t) return "";
  if (isHttpUrl(t)) return t;
  return parseHyperlinkFormula(t);
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function urlFromRowByHeader(
  row: Record<string, string>,
  ...headerNames: string[]
): string {
  const wants = new Set(headerNames.map(normalizeHeader));
  for (const [key, val] of Object.entries(row)) {
    if (key.startsWith("_")) continue;
    if (!wants.has(normalizeHeader(key))) continue;
    const u = cellLinkValue(val);
    if (u) return u;
  }
  return "";
}

function urlFromColumnIndex(cells: string[], index: number): string {
  if (index < 0 || index >= cells.length) return "";
  return cellLinkValue(cells[index]);
}

function urlFromCellsByHeader(
  headers: string[],
  cells: string[],
  headerName: string,
): string {
  const want = normalizeHeader(headerName);
  const i = headers.findIndex((h) => normalizeHeader(h) === want);
  if (i < 0) return "";
  return cellLinkValue(cells[i]);
}

export type BlsSkillsCheckoffStudentUrls = {
  skillsSheet: string;
  evaluation: string;
  certificate: string;
};

export function resolveBlsSkillsCheckoffStudentUrls(
  row: Record<string, string>,
  headers: string[],
  cells: string[],
): BlsSkillsCheckoffStudentUrls {
  const skillsSheet =
    urlFromColumnIndex(cells, BLS_SKILLS_CHECK_SKILLS_COLUMN_INDEX) ||
    urlFromRowByHeader(row, "Skill Sheet", "Skills Sheet") ||
    urlFromCellsByHeader(headers, cells, "Skill Sheet");

  const evaluation =
    urlFromColumnIndex(cells, BLS_SKILLS_CHECK_EVALUATION_COLUMN_INDEX) ||
    urlFromRowByHeader(row, "Evaluations", "Evaluation Sheet") ||
    urlFromCellsByHeader(headers, cells, "Evaluations") ||
    urlFromCellsByHeader(headers, cells, "Evaluation Sheet");

  const certificate =
    cellLinkValue(cells[BLS_SKILLS_CHECK_CERTIFICATE_COLUMN_INDEX]) ||
    urlFromRowByHeader(row, CERTIFICATE_HEADER) ||
    urlFromCellsByHeader(headers, cells, CERTIFICATE_HEADER);

  return { skillsSheet, evaluation, certificate };
}

export function enrichBlsSkillsCheckoffStudentRow(
  row: StudentRow,
  headers: string[],
  cells: string[],
): StudentRow {
  const urls = resolveBlsSkillsCheckoffStudentUrls(row, headers, cells);
  return {
    ...row,
    _skillsSheetUrl: urls.skillsSheet || row._skillsSheetUrl,
    _evaluationUrl: urls.evaluation,
    _certificateUrl: urls.certificate,
  };
}

export type BlsSkillsCheckoffStudentLinks = StudentResourceLinks & {
  certificate: string;
};

export function getBlsSkillsCheckoffStudentLinks(
  row: StudentRow,
): BlsSkillsCheckoffStudentLinks {
  const urls = resolveBlsSkillsCheckoffStudentUrls(row, [], []);
  return {
    evaluation: row._evaluationUrl || urls.evaluation,
    certificate: urls.certificate || row._certificateUrl || "",
  };
}

export function blsSkillsCheckoffCertificateUrl(
  row: StudentRow,
): string {
  return row._certificateUrl || "";
}
