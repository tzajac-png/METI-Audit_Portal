import { parseCSV, rowsToObjects } from "@/lib/csv";
import {
  fetchSheetGridOmittingHiddenRows,
  fetchSheetValuesAsTable,
} from "@/lib/google-sheets-api";

/** Student Sign Up 2026 spreadsheet ID */
export const DEFAULT_SHEET_ID =
  "1J9OO6YGdwnArcVn_K8CUHQHwOiIAeQj2vZcpyIbWWTE";

/** Tab: BLS Student (and other student signups) */
export const DEFAULT_GID_STUDENTS = "854682937";

/** Tab: Instructor Roster (BLS course rows for this build) */
export const DEFAULT_GID_BLS_INSTRUCTOR = "89421864";

/** Tab: HS BLS Skills Check — instructor course rows */
export const DEFAULT_GID_BLS_SKILLS_CHECKOFF_INSTRUCTOR = "1496083152";

/** Tab: HS BLS Skills Check — student signups */
export const DEFAULT_GID_BLS_SKILLS_CHECKOFF_STUDENTS = "107260065";

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
/** Optional: skip heavy grid fetch and use values API only (fast; UI-hidden rows/columns still appear). */
const SHEET_PREFER_VALUES_API_ENV = "GOOGLE_SHEETS_PREFER_VALUES_API";
/** Optional: set to a positive number (seconds) to cache sheet fetches. Omit for always-current sheet data. */
const SHEET_FETCH_CACHE_SECONDS_ENV = "GOOGLE_SHEETS_FETCH_CACHE_SECONDS";

function sheetTableFetchMode(options?: { live?: boolean }): {
  live?: boolean;
  revalidateSeconds?: number;
} {
  if (options?.live === true) {
    return { live: true };
  }
  const raw = process.env[SHEET_FETCH_CACHE_SECONDS_ENV]?.trim();
  if (!raw) return {};
  const sec = parseInt(raw, 10);
  if (!Number.isFinite(sec) || sec <= 0) return {};
  return { revalidateSeconds: sec };
}

function sheetTableRequestInit(mode: ReturnType<typeof sheetTableFetchMode>): RequestInit {
  const headers = { "User-Agent": "METI-Audit-Portal/1.0" };
  if (mode.live === true) {
    return { cache: "no-store", headers };
  }
  if (
    mode.revalidateSeconds != null &&
    Number.isFinite(mode.revalidateSeconds) &&
    mode.revalidateSeconds > 0
  ) {
    return { next: { revalidate: mode.revalidateSeconds }, headers };
  }
  return { cache: "no-store", headers };
}

/**
 * Loads a tab from an arbitrary spreadsheet (same API key / CSV rules as
 * {@link fetchSheetTable}).
 *
 * By default, fetches use `cache: no-store` so the portal reflects the current sheet.
 * Set `GOOGLE_SHEETS_FETCH_CACHE_SECONDS` to a positive number to cache reads (seconds).
 *
 * When `GOOGLE_SHEETS_API_KEY` is set, the app first tries the **grid** API (respects
 * hidden rows/columns). If that fails or times out on large tabs, it automatically
 * retries with the **values** API (smaller payload; hidden UI rows may still show).
 * Set `GOOGLE_SHEETS_PREFER_VALUES_API=true` to skip grid and load values only.
 *
 * Pass `{ valuesOnly: true }` for tabs that should avoid grid fetch (e.g. formula-heavy
 * student response sheets). Student signups use values-only by default via
 * {@link fetchStudentRowsForTabGid} unless `GOOGLE_SHEETS_STUDENT_TAB_USE_GRID=true`.
 */
export async function fetchSheetTableFromWorkbook(
  sheetId: string,
  gid: string,
  options?: { live?: boolean; valuesOnly?: boolean },
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

  const mode = sheetTableFetchMode(options);
  const fetchInit = sheetTableRequestInit(mode);

  if (apiKey) {
    const preferValuesOnly =
      options?.valuesOnly === true ||
      process.env[SHEET_PREFER_VALUES_API_ENV]?.trim() === "true" ||
      process.env[SHEET_PREFER_VALUES_API_ENV]?.trim() === "1";

    if (preferValuesOnly) {
      const { table, sourceUrl } = await fetchSheetValuesAsTable(
        sheetId,
        gid,
        apiKey,
        mode,
      );
      return buildTableFromRows(table, sourceUrl);
    }

    try {
      const { table, sourceUrl } = await fetchSheetGridOmittingHiddenRows(
        sheetId,
        gid,
        apiKey,
        mode,
      );
      return buildTableFromRows(table, sourceUrl);
    } catch (gridErr) {
      const gridMsg =
        gridErr instanceof Error ? gridErr.message : String(gridErr);
      try {
        const { table, sourceUrl } = await fetchSheetValuesAsTable(
          sheetId,
          gid,
          apiKey,
          mode,
        );
        return buildTableFromRows(table, sourceUrl);
      } catch (valuesErr) {
        const valuesMsg =
          valuesErr instanceof Error ? valuesErr.message : String(valuesErr);
        throw new Error(
          `Google Sheet could not be loaded. Grid fetch: ${gridMsg}. Values fallback: ${valuesMsg}. ` +
            `Confirm GOOGLE_SHEETS_API_KEY is set, the Google Sheets API is enabled for that key in Google Cloud, ` +
            `and the spreadsheet is shared as “Anyone with the link can view”. ` +
            `For very large tabs, set GOOGLE_SHEETS_PREFER_VALUES_API=true on the server.`,
        );
      }
    }
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
  options?: { live?: boolean; valuesOnly?: boolean },
): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  rawRowCells: string[][];
  sourceUrl: string;
}> {
  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID;
  return fetchSheetTableFromWorkbook(sheetId, gid, options);
}
