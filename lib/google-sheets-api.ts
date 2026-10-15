/**
 * Google Sheets API v4 fetch: omits rows and columns hidden in the spreadsheet UI,
 * and rows/columns hidden by filters (when exposed by the API).
 *
 * Public CSV export does not expose visibility — it usually includes hidden rows/columns.
 *
 * Requires GOOGLE_SHEETS_API_KEY with Sheets API enabled, and the spreadsheet
 * shared so the key can read it (or use OAuth for private sheets).
 */

type CellData = {
  formattedValue?: string;
  hyperlink?: string;
  effectiveValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
  };
};

type RowData = { values?: CellData[] } | null | undefined;

type DimensionProperties = {
  hiddenByUser?: boolean;
  /** Present when a filter hides the row/column */
  hiddenByFilter?: boolean;
};

type GridData = {
  rowMetadata?: DimensionProperties[];
  columnMetadata?: DimensionProperties[];
  rowData?: RowData[];
};

type SheetsMetadataResponse = {
  sheets?: { properties?: { sheetId?: number; title?: string } }[];
};

type SheetsGridResponse = {
  sheets?: { data?: GridData[] }[];
};

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function parseHyperlinkFormula(formula: string): string {
  const m = formula.match(/HYPERLINK\s*\(\s*"((?:[^"\\]|\\.)*)"/i);
  if (!m?.[1]) return "";
  const url = m[1].replace(/\\"/g, '"').trim();
  return isHttpUrl(url) ? url : "";
}

/** Prefer hyperlink URI, then raw URL in cell, then HYPERLINK() formula target. */
export function cellLinkValue(c: CellData | undefined): string {
  if (!c) return "";
  if (c.hyperlink && isHttpUrl(c.hyperlink)) return c.hyperlink.trim();
  const formatted =
    c.formattedValue != null ? String(c.formattedValue).trim() : "";
  if (isHttpUrl(formatted)) return formatted;
  const fromFormula = parseHyperlinkFormula(
    c.effectiveValue?.formulaValue ?? "",
  );
  if (fromFormula) return fromFormula;
  const ev = c.effectiveValue;
  if (ev?.stringValue && isHttpUrl(ev.stringValue)) return ev.stringValue.trim();
  return cellText(c);
}

function cellText(c: CellData | undefined): string {
  if (!c) return "";
  if (c.formattedValue != null && c.formattedValue !== "") return String(c.formattedValue);
  const ev = c.effectiveValue;
  if (!ev) return "";
  if (ev.stringValue != null) return String(ev.stringValue);
  if (ev.numberValue != null) return String(ev.numberValue);
  if (ev.boolValue != null) return ev.boolValue ? "TRUE" : "FALSE";
  return "";
}

function isDimensionHidden(m: DimensionProperties | undefined): boolean {
  return m?.hiddenByUser === true || m?.hiddenByFilter === true;
}

function escapeA1SheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

type SheetFetchMode = { live?: boolean; revalidateSeconds?: number };

function fetchInitForSheets(mode?: SheetFetchMode): RequestInit {
  const headers = { "User-Agent": "METI-Audit-Portal/1.0" };
  if (mode?.live === true) {
    return { cache: "no-store", headers };
  }
  const sec = mode?.revalidateSeconds;
  if (sec != null && Number.isFinite(sec) && sec > 0) {
    return { next: { revalidate: sec }, headers };
  }
  return { cache: "no-store", headers };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Transient socket / TLS drops from Google (Node fetch / undici) — retry a few times. */
function isTransientNetworkError(e: unknown): boolean {
  if (e == null) return false;
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("connection closed") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("terminated") ||
    lower.includes("socket") ||
    lower.includes("und_err") ||
    lower.includes("other side closed")
  ) {
    return true;
  }
  const cause = e instanceof Error ? e.cause : undefined;
  if (cause instanceof Error) return isTransientNetworkError(cause);
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    const code = String((cause as { code?: string }).code ?? "");
    if (code === "ECONNRESET" || code === "UND_ERR_SOCKET") return true;
  }
  return false;
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

async function sheetsApiFetch(url: string, init: RequestInit): Promise<Response> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      const shouldRetry =
        isRetryableHttpStatus(res.status) && attempt < maxAttempts - 1;
      if (!shouldRetry) return res;
      await res.arrayBuffer().catch(() => undefined);
    } catch (e) {
      if (attempt === maxAttempts - 1 || !isTransientNetworkError(e)) {
        throw e;
      }
    }
    await delay(350 * (attempt + 1));
  }
  throw new Error("Sheets API fetch failed after retries.");
}

async function getSheetTitleByGid(
  spreadsheetId: string,
  gid: string,
  apiKey: string,
  mode?: SheetFetchMode,
): Promise<string> {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
  );
  url.searchParams.set("fields", "sheets(properties(sheetId,title))");
  url.searchParams.set("key", apiKey);

  const res = await sheetsApiFetch(url.toString(), fetchInitForSheets(mode));
  if (!res.ok) {
    throw new Error(
      `Sheets metadata failed (${res.status}). Check GOOGLE_SHEETS_API_KEY and API access.`,
    );
  }
  const data = (await res.json()) as SheetsMetadataResponse;
  const want = parseInt(gid, 10);
  if (Number.isNaN(want)) {
    throw new Error(`Invalid gid: ${gid}`);
  }
  for (const s of data.sheets ?? []) {
    const id = s.properties?.sheetId;
    const title = s.properties?.title;
    if (id === want && title) return title;
  }
  throw new Error(`No sheet with gid ${gid} in spreadsheet.`);
}

function rowToStringsForColumns(row: RowData, visibleCols: number[]): string[] {
  const values = row?.values;
  return visibleCols.map((j) => cellLinkValue(values?.[j]));
}

type SheetsValuesResponse = {
  values?: unknown[][];
};

function cellValueToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Fast, small JSON: cell values only (no row/column hide metadata).
 * Use when {@link fetchSheetGridOmittingHiddenRows} times out or fails on large tabs.
 */
export async function fetchSheetValuesAsTable(
  spreadsheetId: string,
  gid: string,
  apiKey: string,
  mode?: SheetFetchMode,
): Promise<{ table: string[][]; sourceUrl: string }> {
  const title = await getSheetTitleByGid(spreadsheetId, gid, apiKey, mode);
  const range = `${escapeA1SheetTitle(title)}!A:ZZ`;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

  const res = await sheetsApiFetch(url.toString(), fetchInitForSheets(mode));
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Sheets values failed (${res.status}). ${errText.slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as SheetsValuesResponse;
  const raw = json.values ?? [];
  const editUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}#gid=${gid}`;
  if (raw.length === 0) {
    return { table: [], sourceUrl: editUrl };
  }
  let maxW = 0;
  for (const row of raw) {
    maxW = Math.max(maxW, Array.isArray(row) ? row.length : 0);
  }
  const table: string[][] = raw.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const r = cells.map(cellValueToString);
    while (r.length < maxW) r.push("");
    return r;
  });
  return { table, sourceUrl: editUrl };
}

/**
 * Fetch grid values, omitting rows/columns hidden in the UI or by filters.
 */
export async function fetchSheetGridOmittingHiddenRows(
  spreadsheetId: string,
  gid: string,
  apiKey: string,
  mode?: SheetFetchMode,
): Promise<{ table: string[][]; sourceUrl: string }> {
  const title = await getSheetTitleByGid(spreadsheetId, gid, apiKey, mode);
  const range = `${escapeA1SheetTitle(title)}!A:ZZ`;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
  );
  url.searchParams.append("ranges", range);
  url.searchParams.set("includeGridData", "true");
  url.searchParams.set(
    "fields",
    "sheets(data(rowData(values(hyperlink,formattedValue,effectiveValue,userEnteredValue)),rowMetadata,columnMetadata))",
  );
  url.searchParams.set("key", apiKey);

  const res = await sheetsApiFetch(url.toString(), fetchInitForSheets(mode));
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Sheets grid failed (${res.status}). ${errText.slice(0, 200)}`,
    );
  }
  let json: SheetsGridResponse;
  try {
    json = (await res.json()) as SheetsGridResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Sheets grid response could not be read (${msg}). The tab may be too large for grid data; the app will try a lighter values-only fetch.`,
    );
  }
  const grid = json.sheets?.[0]?.data?.[0];
  const editUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}#gid=${gid}`;
  if (!grid?.rowData?.length) {
    return { table: [], sourceUrl: editUrl };
  }

  const rowData = grid.rowData;
  const rowMeta = grid.rowMetadata ?? [];
  const colMeta = grid.columnMetadata ?? [];

  const visibleRowIndices: number[] = [];
  for (let i = 0; i < rowData.length; i++) {
    if (isDimensionHidden(rowMeta[i])) continue;
    visibleRowIndices.push(i);
  }

  if (visibleRowIndices.length === 0) {
    return { table: [], sourceUrl: editUrl };
  }

  let maxCol = colMeta.length;
  for (const i of visibleRowIndices) {
    const n = rowData[i]?.values?.length ?? 0;
    maxCol = Math.max(maxCol, n);
  }
  if (maxCol === 0) {
    return { table: [], sourceUrl: editUrl };
  }

  const visibleColIndices: number[] = [];
  for (let j = 0; j < maxCol; j++) {
    if (isDimensionHidden(colMeta[j])) continue;
    visibleColIndices.push(j);
  }

  if (visibleColIndices.length === 0) {
    return { table: [], sourceUrl: editUrl };
  }

  const table: string[][] = [];
  for (const i of visibleRowIndices) {
    const rd = rowData[i];
    if (rd == null) continue;
    table.push(rowToStringsForColumns(rd, visibleColIndices));
  }

  return { table, sourceUrl: editUrl };
}
