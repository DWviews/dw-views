import * as XLSX from "xlsx";
import { parseKeywordTable } from "./keyword-parser";
import type { KeywordRow } from "./keyword-types";

function sheetToTable(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
}

export function parseKeywordXlsx(buffer: Buffer): KeywordRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const rows = parseKeywordTable(sheetToTable(workbook.Sheets[sheetName]));
    if (rows.length > 0) return rows;
  }

  return [];
}

export function isExcelFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
