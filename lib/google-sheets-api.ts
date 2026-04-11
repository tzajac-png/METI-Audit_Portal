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
  effectiveValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean };
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

type SheetFetchMode = { live?: boolean };

function fetchInitForSheets(live?: boolean): RequestInit {
  if (live) {
    return {
      cache: "no-store",
      headers: { "User-Agent": "METI-Audit-Portal/1.0" },
    };
  }
  return {
    next: { revalidate: 60 },
    headers: { "User-Agent": "METI-Audit-Portal/1.0" },
  };
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

  const res = await fetch(url.toString(), fetchInitForSheets(mode?.live));
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
  return visibleCols.map((j) => cellText(values?.[j]));
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
    "sheets(data(rowData,rowMetadata,columnMetadata))",
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), fetchInitForSheets(mode?.live));
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Sheets grid failed (${res.status}). ${errText.slice(0, 200)}`,
    );
  }
  const json = (await res.json()) as SheetsGridResponse;
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
