import type { KeywordRow } from "./keyword-types";

export interface KeywordRowWithBoost extends KeywordRow {
  boostPct: number;
}

function roundInt(n: number): number {
  return Math.max(0, Math.round(n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function distributeMetric(
  values: number[],
  boostPcts: number[],
  round: (n: number) => number
): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [...values];

  const raw = values.map(
    (value, index) => value * (1 + (boostPcts[index] ?? 0) / 100)
  );
  const rawTotal = raw.reduce((sum, value) => sum + value, 0);
  if (rawTotal <= 0) return [...values];

  const scale = total / rawTotal;
  const adjusted = raw.map((value) => round(value * scale));

  const diff = total - adjusted.reduce((sum, value) => sum + value, 0);
  if (diff !== 0 && adjusted.length > 0) {
    const maxIdx = adjusted.indexOf(Math.max(...adjusted));
    adjusted[maxIdx] = round(adjusted[maxIdx] + diff);
  }

  return adjusted;
}

export function applyKeywordBoosts(
  rows: KeywordRowWithBoost[]
): KeywordRow[] {
  if (rows.length === 0) return [];

  const boostPcts = rows.map((row) => row.boostPct ?? 0);
  const impressions = distributeMetric(
    rows.map((row) => row.impressions),
    boostPcts,
    roundInt
  );
  const clicks = distributeMetric(
    rows.map((row) => row.clicks),
    boostPcts,
    roundInt
  );
  const costs = distributeMetric(
    rows.map((row) => row.cost),
    boostPcts,
    round2
  );

  return rows
    .map((row, index) => {
      const impr = impressions[index];
      const clk = clicks[index];
      const cost = costs[index];
      return {
        keyword: row.keyword,
        impressions: impr,
        clicks: clk,
        ctr: impr > 0 ? round2((clk / impr) * 100) : 0,
        cost,
        avgCpc: clk > 0 ? round2(cost / clk) : 0,
        absTopPct: row.absTopPct,
        topPct: row.topPct,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}
