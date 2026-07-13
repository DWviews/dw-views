import * as XLSX from "xlsx";
import type { KeywordRow } from "./keyword-parser";

export interface KeywordExportItem {
  keyword: string;
  boostPct?: number;
  adjusted: KeywordRow;
}

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "keywords";
}

export function buildKeywordExportRows(
  items: KeywordExportItem[],
  includeBoost = false
): Record<string, string | number>[] {
  return items.map((item) => {
    const row = item.adjusted;
    const record: Record<string, string | number> = {
      Keyword: row.keyword,
      "Impr.": row.impressions,
      Clicks: row.clicks,
      CTR: `${row.ctr.toFixed(2)}%`,
      Cost: row.cost,
      "Avg. CPC": row.avgCpc,
      "Impr. (Abs. Top) %": `${row.absTopPct.toFixed(2)}%`,
      "Impr. (Top) %": `${row.topPct.toFixed(2)}%`,
    };
    if (includeBoost) {
      record["提升 %"] = item.boostPct ?? 0;
    }
    return record;
  });
}

export function downloadKeywordsExcel(
  items: KeywordExportItem[],
  options: {
    projectName: string;
    reportMonth: string;
    includeBoost?: boolean;
  }
) {
  const rows = buildKeywordExportRows(items, options.includeBoost);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Keywords");

  const filename = `${safeFilename(options.projectName)}-${safeFilename(options.reportMonth)}-keywords.xlsx`;
  XLSX.writeFile(workbook, filename);
}
