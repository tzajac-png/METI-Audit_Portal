/** Instructor tab — “Paid for by Northville? (Tyler & Charlie ONLY)”. */
export const NORTHVILLE_PAID_COLUMN_KEYS = [
  "Paid for by Northville? (Tyler & Charlie ONLY)",
  "Paid for by Northville?",
] as const;

function pick(row: Record<string, string>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  for (const [key, val] of Object.entries(row)) {
    if (key.startsWith("_")) continue;
    const nk = key.trim().toLowerCase();
    for (const want of keys) {
      if (nk === want.trim().toLowerCase()) return String(val ?? "").trim();
    }
  }
  return "";
}

/** True when “Paid for by Northville?” is Yes on the instructor row. */
export function isPaidForByNorthville(raw: Record<string, string>): boolean {
  const paid = pick(raw, NORTHVILLE_PAID_COLUMN_KEYS).toLowerCase();
  return paid === "yes" || paid === "y" || paid === "true";
}

/** @deprecated Use {@link isPaidForByNorthville}. Location is ignored. */
export function needsNorthvilleCityCharge(
  raw: Record<string, string>,
  _location?: string,
): boolean {
  return isPaidForByNorthville(raw);
}

/** Table row — Northville-paid classes (Paid for by Northville? = Yes). */
export const NORTHVILLE_ROW_CLASS =
  "bg-red-950/75 border-l-[5px] border-l-red-500 text-red-50 ring-1 ring-inset ring-red-500/60 hover:bg-red-950/90";

/** Course detail banner for the same flag. */
export const NORTHVILLE_BANNER_CLASS =
  "rounded-xl border-2 border-red-500/80 bg-red-950/65 px-4 py-3 text-sm font-medium text-red-50 shadow-lg shadow-red-950/60";

/** Legend copy above tables that use {@link NORTHVILLE_ROW_CLASS}. */
export const NORTHVILLE_LEGEND_CLASS = "text-sm font-medium text-red-300";
