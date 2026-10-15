/**
 * Resolves evaluation URL from spreadsheet column names.
 * Exam and skills come from student-roster (_examPdfUrl / _skillsSheetUrl), including
 * PALS column CO for Exam.
 */

const EVAL_EXACT = [
  "Evaluation",
  "Course Evaluation",
  "Evaluation Link",
  "Evaluation URL",
  "Student Evaluation",
  "Evaluation Sheet",
  "Response Edit URL",
] as const;

function isHttpUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

function pickExactUrl(
  row: Record<string, string>,
  keys: readonly string[],
): string {
  const wants = new Set(keys.map((k) => k.trim().toLowerCase()));
  for (const [key, val] of Object.entries(row)) {
    if (key.startsWith("_")) continue;
    if (!wants.has(key.trim().toLowerCase())) continue;
    const v = (val ?? "").trim();
    if (isHttpUrl(v)) return v;
  }
  return "";
}

function pickByColumnHint(
  row: Record<string, string>,
  mustInclude: string,
): string {
  const hint = mustInclude.toLowerCase();
  for (const [key, val] of Object.entries(row)) {
    if (!key.toLowerCase().includes(hint)) continue;
    const v = (val ?? "").trim();
    if (isHttpUrl(v)) return v;
  }
  return "";
}

export type StudentResourceLinks = {
  evaluation: string;
};

export function getStudentResourceLinks(
  row: Record<string, string>,
): StudentResourceLinks {
  const evaluation =
    pickExactUrl(row, EVAL_EXACT) ||
    pickByColumnHint(row, "evaluation") ||
    pickByColumnHint(row, "eval");

  return {
    evaluation,
  };
}
