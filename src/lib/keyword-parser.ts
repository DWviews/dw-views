import type { KeywordRow } from "./keyword-types";

export type { KeywordRow } from "./keyword-types";

type ColumnKey =
  | "keyword"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cost"
  | "avgCpc"
  | "absTopPct"
  | "topPct";

const REQUIRED_COLUMNS: ColumnKey[] = ["keyword", "impressions"];

function cellText(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function normalizeHeader(header: string): string {
  return header
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isKeywordHeader(header: string): boolean {
  const h = normalizeHeader(header);
  if (!h || h.includes("status")) return false;
  return (
    h === "keyword" ||
    h === "keywords" ||
    h === "search keyword" ||
    h === "關鍵字" ||
    h === "搜尋關鍵字"
  );
}

function isImpressionsHeader(header: string): boolean {
  const h = normalizeHeader(header);
  if (!h || h.includes("(") || h.includes("top") || h.includes("abs")) {
    return false;
  }
  return (
    /^impr\.?$/.test(h) ||
    h === "impressions" ||
    h === "impr" ||
    h === "曝光" ||
    h === "曝光次數" ||
    h === "展示次数" ||
    h === "展示次數"
  );
}

function isClicksHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return h === "clicks" || h === "點擊" || h === "點擊次數" || h === "点击";
}

function isCtrHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return (
    h === "ctr" ||
    h === "click-through rate" ||
    h === "點閱率" ||
    h === "點擊率" ||
    h === "点击率"
  );
}

function isCostHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return (
    h === "cost" ||
    h === "費用" ||
    h === "费用" ||
    h.startsWith("cost (") ||
    h.startsWith("cost(")
  );
}

function isAvgCpcHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return (
    h.includes("avg. cpc") ||
    h.includes("avg cpc") ||
    h.includes("average cpc") ||
    h === "平均單次點擊出價" ||
    h === "平均每次点击费用"
  );
}

function isAbsTopHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return h.includes("abs. top") || h.includes("abs top") || h.includes("绝对");
}

function isTopHeader(header: string): boolean {
  const h = normalizeHeader(header);
  if (h.includes("abs")) return false;
  return (
    h.includes("impr. (top)") ||
    h.includes("impr (top)") ||
    h.includes("top) %") ||
    h.includes("页首") ||
    h.includes("頁首")
  );
}

const COLUMN_MATCHERS: Record<ColumnKey, (header: string) => boolean> = {
  keyword: isKeywordHeader,
  impressions: isImpressionsHeader,
  clicks: isClicksHeader,
  ctr: isCtrHeader,
  cost: isCostHeader,
  avgCpc: isAvgCpcHeader,
  absTopPct: isAbsTopHeader,
  topPct: isTopHeader,
};

export function resolveKeywordColumns(
  headers: string[]
): Partial<Record<ColumnKey, number>> | null {
  const indices: Partial<Record<ColumnKey, number>> = {};

  headers.forEach((header, index) => {
    if (!header) return;
    (Object.keys(COLUMN_MATCHERS) as ColumnKey[]).forEach((key) => {
      if (indices[key] !== undefined) return;
      if (COLUMN_MATCHERS[key](header)) {
        indices[key] = index;
      }
    });
  });

  const hasRequired = REQUIRED_COLUMNS.every((key) => indices[key] !== undefined);
  return hasRequired ? indices : null;
}

function findHeaderRow(
  rows: string[][]
): { headerRowIdx: number; columns: Partial<Record<ColumnKey, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const columns = resolveKeywordColumns(rows[i]);
    if (columns) {
      return { headerRowIdx: i, columns };
    }
  }
  return null;
}

function parseNumber(val: string): number {
  if (!val || val === "No data" || val === "--" || val === " --") return 0;
  const cleaned = val.replace(/[",HK$NT$%<>\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function parsePercent(val: string): number {
  if (!val || val === "No data" || val === "--" || val === " --") return 0;
  if (val.includes("<")) return 5;
  return parseNumber(val);
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeTableRows(rows: unknown[][]): string[][] {
  return rows
    .map((row) => row.map((cell) => cellText(cell)))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function readCell(values: string[], index: number | undefined): string {
  if (index === undefined || index < 0) return "";
  return values[index] || "";
}

export function parseKeywordTable(rows: unknown[][]): KeywordRow[] {
  const table = normalizeTableRows(rows);
  const header = findHeaderRow(table);
  if (!header) return [];

  const { headerRowIdx, columns } = header;
  const keywordIdx = columns.keyword!;
  const imprIdx = columns.impressions!;

  const result: KeywordRow[] = [];

  for (let i = headerRowIdx + 1; i < table.length; i++) {
    const values = table[i];
    const keyword = readCell(values, keywordIdx).trim();
    const impressions = parseNumber(readCell(values, imprIdx));

    if (
      !keyword ||
      keyword === "--" ||
      keyword.toLowerCase().startsWith("total:") ||
      keyword.toLowerCase().includes("total:") ||
      impressions <= 0
    ) {
      continue;
    }

    result.push({
      keyword,
      impressions,
      clicks: parseNumber(readCell(values, columns.clicks)),
      ctr: parsePercent(readCell(values, columns.ctr)),
      cost: parseNumber(readCell(values, columns.cost)),
      avgCpc: parseNumber(readCell(values, columns.avgCpc)),
      absTopPct: parsePercent(readCell(values, columns.absTopPct)),
      topPct: parsePercent(readCell(values, columns.topPct)),
    });
  }

  return result.sort((a, b) => b.impressions - a.impressions);
}

function cleanContent(content: string): string {
  if (content.includes("\u0000")) {
    return Buffer.from(content, "binary")
      .toString("utf16le")
      .replace(/^\uFEFF/, "")
      .trim();
  }
  return content.replace(/^\uFEFF/, "").trim();
}

export function parseKeywordCsv(content: string): KeywordRow[] {
  const text = cleanContent(content);
  const lines = text.split("\n").filter((line) => line.trim());
  const rows = lines.map((line) => splitLine(line));
  return parseKeywordTable(rows);
}

