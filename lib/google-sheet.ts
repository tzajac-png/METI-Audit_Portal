import { parseCSV, rowsToObjects } from "@/lib/csv";
import { fetchSheetGridOmittingHiddenRows } from "@/lib/google-sheets-api";

/** Student Sign Up 2026 spreadsheet ID */
export const DEFAULT_SHEET_ID =
  "1J9OO6YGdwnArcVn_K8CUHQHwOiIAeQj2vZcpyIbWWTE";

/** Tab: BLS Student (and other student signups) */
export const DEFAULT_GID_STUDENTS = "854682937";

/** Tab: Instructor Roster (BLS course rows for this build) */
export const DEFAULT_GID_BLS_INSTRUCTOR = "89421864";

/** Program-specific student signup tabs (same workbook) */
export const DEFAULT_GID_ACLS_STUDENTS = "907531989";
export const DEFAULT_GID_PALS_STUDENTS = "504976157";
export const DEFAULT_GID_HEARTSAVER_STUDENTS = "1663755098";

/** Tab: Student Master / directory (all students) */
export const DEFAULT_GID_STUDENT_DIRECTORY = "590953723";

/** Tab: Instructor directory (person roster — names, credentials, etc.) */
export const DEFAULT_GID_INSTRUCTOR_DIRECTORY = "482270132";

/** Tab: Google Form responses — instructor document uploads (type, link, expiration) */
export const DEFAULT_GID_INSTRUCTOR_UPLOAD_FORM = "1991989031";

function buildExportUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function buildTableFromRows(
  table: string[][],
  sourceUrl: string,
): {
  headers: string[];
  rows: Record<string, string>[];
  rawRowCells: string[][];
  sourceUrl: string;
} {
  if (table.length < 2) {
    return {
      headers: table[0]?.map((h) => h.trim()) ?? [],
      rows: [],
      rawRowCells: [],
      sourceUrl,
    };
  }

  const headers = table[0].map((h) => h.trim());
  const dataRows = table
    .slice(1)
    .filter((r) => r.some((c) => c.trim().length > 0));
  const rows = rowsToObjects(headers, dataRows);
  const rawRowCells = dataRows.map((r) => [...r]);

  return { headers, rows, rawRowCells, sourceUrl };
}

const CSV_FALLBACK_ENV = "GOOGLE_SHEETS_ALLOW_CSV_FALLBACK";

/**
 * Loads a tab by `gid`.
 *
 * **`GOOGLE_SHEETS_API_KEY` is required** so hidden rows/columns and filter-hidden
 * dimensions match Google Sheets. Public CSV export cannot represent visibility.
 *
 * For local testing without a key, set `GOOGLE_SHEETS_ALLOW_CSV_FALLBACK=true`
 * (hidden data may still appear in the portal).
 */
/**
 * Load a tab from an arbitrary spreadsheet (same API key / CSV rules as
 * {@link fetchSheetTable}).
 */
export async function fetchSheetTableFromWorkbook(
  sheetId: string,
  gid: string,
  options?: { live?: boolean },
): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  rawRowCells: string[][];
  sourceUrl: string;
}> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY?.trim();
  const allowCsv =
    process.env[CSV_FALLBACK_ENV]?.trim() === "true" ||
    process.env[CSV_FALLBACK_ENV]?.trim() === "1";

  const fetchInit: RequestInit = options?.live
    ? {
        cache: "no-store",
        headers: { "User-Agent": "METI-Audit-Portal/1.0" },
      }
    : {
        next: { revalidate: 60 },
        headers: { "User-Agent": "METI-Audit-Portal/1.0" },
      };

  if (apiKey) {
    const { table, sourceUrl } = await fetchSheetGridOmittingHiddenRows(
      sheetId,
      gid,
      apiKey,
      options?.live ? { live: true } : undefined,
    );
    return buildTableFromRows(table, sourceUrl);
  }

  if (!allowCsv) {
    throw new Error(
      `GOOGLE_SHEETS_API_KEY is required: rows/columns hidden in Google Sheets are only respected when using the Sheets API. ` +
        `Public CSV cannot hide data. Add a Cloud API key with Sheets API enabled, or for insecure local testing only set ${CSV_FALLBACK_ENV}=true.`,
    );
  }

  const url = buildExportUrl(sheetId, gid);

  const res = await fetch(url, fetchInit);

  if (!res.ok) {
    throw new Error(
      `Sheet fetch failed (${res.status}). Ensure the spreadsheet is shared as “Anyone with the link can view”.`,
    );
  }

  const text = await res.text();
  const table = parseCSV(text);
  return buildTableFromRows(table, url);
}

export async function fetchSheetTable(
  gid: string,
  options?: { live?: boolean },
): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  rawRowCells: string[][];
  sourceUrl: string;
}> {
  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID;
  return fetchSheetTableFromWorkbook(sheetId, gid, options);
}
