import { getSupabaseAdmin } from "./supabase";
import type { KeywordRow } from "./keyword-types";
import { parseKeywordCsv } from "./keyword-parser";
import {
  applyKeywordBoosts,
  type KeywordRowWithBoost,
} from "./keyword-adjust";

export type { KeywordRow } from "./keyword-types";

function isExcelFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export interface KeywordAdminItem {
  keyword: string;
  boostPct: number;
  base: KeywordRow;
  adjusted: KeywordRow;
}

function mapDbRow(record: {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  avg_cpc: number;
  abs_top_pct: number;
  top_pct: number;
  boost_pct: number;
}): KeywordRowWithBoost {
  return {
    keyword: record.keyword,
    impressions: record.impressions,
    clicks: record.clicks,
    ctr: record.ctr,
    cost: record.cost,
    avgCpc: record.avg_cpc,
    absTopPct: record.abs_top_pct,
    topPct: record.top_pct,
    boostPct: record.boost_pct ?? 0,
  };
}

export async function getKeywordRowsBase(
  monthId: number
): Promise<KeywordRowWithBoost[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_keyword_rows")
    .select(
      "keyword, impressions, clicks, ctr, cost, avg_cpc, abs_top_pct, top_pct, boost_pct"
    )
    .eq("project_month_id", monthId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapDbRow);
}

export async function getKeywordRows(monthId: number): Promise<KeywordRow[]> {
  const baseRows = await getKeywordRowsBase(monthId);
  return applyKeywordBoosts(baseRows);
}

export async function getKeywordAdminItems(
  monthId: number
): Promise<KeywordAdminItem[]> {
  const baseRows = await getKeywordRowsBase(monthId);
  const adjusted = applyKeywordBoosts(baseRows);
  const adjustedMap = new Map(adjusted.map((row) => [row.keyword, row]));

  return baseRows.map((row) => ({
    keyword: row.keyword,
    boostPct: row.boostPct,
    base: {
      keyword: row.keyword,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      cost: row.cost,
      avgCpc: row.avgCpc,
      absTopPct: row.absTopPct,
      topPct: row.topPct,
    },
    adjusted: adjustedMap.get(row.keyword) ?? {
      keyword: row.keyword,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      cost: row.cost,
      avgCpc: row.avgCpc,
      absTopPct: row.absTopPct,
      topPct: row.topPct,
    },
  }));
}

export async function saveKeywordRows(
  monthId: number,
  rows: KeywordRow[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("project_keyword_rows")
    .delete()
    .eq("project_month_id", monthId);
  if (deleteError) throw deleteError;

  if (rows.length === 0) return;

  const insertRows = rows.map((row, index) => ({
    project_month_id: monthId,
    keyword: row.keyword,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    cost: row.cost,
    avg_cpc: row.avgCpc,
    abs_top_pct: row.absTopPct,
    top_pct: row.topPct,
    boost_pct: 0,
    sort_order: index,
  }));

  const { error: insertError } = await supabase
    .from("project_keyword_rows")
    .insert(insertRows);
  if (insertError) throw insertError;
}

export async function updateKeywordBoosts(
  monthId: number,
  boosts: { keyword: string; boostPct: number }[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const item of boosts) {
    const boostPct = Math.max(-90, Math.min(500, Number(item.boostPct) || 0));
    const { error } = await supabase
      .from("project_keyword_rows")
      .update({ boost_pct: boostPct })
      .eq("project_month_id", monthId)
      .eq("keyword", item.keyword);
    if (error) throw error;
  }
}

export async function importKeywordCsv(
  monthId: number,
  rawContent: string
): Promise<KeywordRow[]> {
  const rows = parseKeywordCsv(rawContent);
  await saveKeywordRows(monthId, rows);
  return getKeywordRows(monthId);
}

export async function importKeywordFile(
  monthId: number,
  buffer: Buffer,
  filename: string
): Promise<KeywordRow[]> {
  let rows: KeywordRow[];
  if (isExcelFilename(filename)) {
    const { parseKeywordXlsx } = await import("./keyword-xlsx");
    rows = parseKeywordXlsx(buffer);
  } else {
    let content = buffer.toString("utf8");
    if (content.includes("\u0000")) {
      content = buffer.toString("utf16le");
    }
    rows = parseKeywordCsv(content);
  }
  await saveKeywordRows(monthId, rows);
  return getKeywordRows(monthId);
}

export async function getKeywordCount(monthId: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("project_keyword_rows")
    .select("*", { count: "exact", head: true })
    .eq("project_month_id", monthId);

  if (error) throw error;
  return count ?? 0;
}
