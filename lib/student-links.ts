/**
 * Resolves evaluation URL from spreadsheet column names.
 * Exam and skills sheet links come from fixed columns BN/BP in student-roster.
 */

const EVAL_EXACT = [
  "Evaluation",
  "Course Evaluation",
  "Evaluation Link",
  "Evaluation URL",
  "Student Evaluation",
] as const;

function isHttpUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

function pickExactUrl(
  row: Record<string, string>,
  keys: readonly string[],
): string {
  for (const k of keys) {
    const v = row[k]?.trim() ?? "";
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
