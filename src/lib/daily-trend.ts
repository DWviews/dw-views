import "server-only";

import { getSupabaseAdmin } from "./supabase";
import {
  daysInReportMonth,
  generateAverageDailyTrend,
  generateDefaultDailyTrend,
  normalizePromo,
  parseDailyTrendRecord,
  parseWeekdayChart,
  type DailyTrendPoint,
  type DailyTrendPromoConfig,
  type DailyTrendRecord,
  type WeekdayChartPoint,
} from "./daily-trend-shared";

export type {
  DailyTrendPoint,
  DailyTrendPromoConfig,
  DailyTrendRecord,
  WeekdayChartPoint,
} from "./daily-trend-shared";

export {
  daysInReportMonth,
  defaultPromoRange,
  generateAverageDailyTrend,
  generateDefaultDailyTrend,
  normalizePromo,
  parseDailyTrendRecord,
  parseWeekdayChart,
  validateDailyTrend,
  validatePromo,
} from "./daily-trend-shared";

function parseJsonField(
  raw: unknown
): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

export async function getDailyTrendRecord(
  monthId: number
): Promise<DailyTrendRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("daily_trend_overrides")
    .eq("id", monthId)
    .maybeSingle();

  if (error) throw error;
  return parseDailyTrendRecord(parseJsonField(data?.daily_trend_overrides));
}

export async function getWeekdayChartOverrides(
  monthId: number
): Promise<WeekdayChartPoint[] | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("weekday_chart_overrides")
    .eq("id", monthId)
    .maybeSingle();

  if (error) throw error;
  return parseWeekdayChart(parseJsonField(data?.weekday_chart_overrides));
}

export async function setDailyTrendRecord(
  monthId: number,
  record: DailyTrendRecord
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_months")
    .update({ daily_trend_overrides: record })
    .eq("id", monthId);

  if (error) throw error;
}

export async function setWeekdayChartOverrides(
  monthId: number,
  points: WeekdayChartPoint[]
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_months")
    .update({ weekday_chart_overrides: points })
    .eq("id", monthId);

  if (error) throw error;
}

export async function persistDashboardCharts(
  monthId: number,
  record: DailyTrendRecord,
  weekdayChart?: WeekdayChartPoint[]
): Promise<void> {
  await setDailyTrendRecord(monthId, record);
  if (weekdayChart && weekdayChart.length > 0) {
    await setWeekdayChartOverrides(monthId, weekdayChart);
  }
}

export async function resolveDailyTrend(
  monthId: number,
  totalClicks: number,
  totalConversions: number,
  reportMonth: string,
  dateRange?: string | null,
  options?: {
    promo?: DailyTrendPromoConfig;
    weekdayChart?: WeekdayChartPoint[];
    persist?: boolean;
    totalImpressions?: number;
    ctr?: number;
    convRate?: number;
  }
): Promise<DailyTrendRecord> {
  const daysInMonth = daysInReportMonth(reportMonth, dateRange);
  const saved = await getDailyTrendRecord(monthId);

  if (saved && saved.points.length === daysInMonth && !options?.promo) {
    return saved;
  }

  const promo = normalizePromo(options?.promo ?? saved?.promo, daysInMonth);
  const weekdayChart =
    options?.weekdayChart ?? (await getWeekdayChartOverrides(monthId)) ?? undefined;
  const points = generateDefaultDailyTrend(
    totalClicks,
    totalConversions,
    daysInMonth,
    promo,
    {
      weekdayChart,
      reportMonth,
      totalImpressions: options?.totalImpressions,
      ctr: options?.ctr,
      convRate: options?.convRate,
    }
  );
  const record = { promo, points };

  if (options?.persist !== false) {
    await persistDashboardCharts(monthId, record, options?.weekdayChart);
  }

  return record;
}

export async function getDailyTrendOverrides(
  monthId: number
): Promise<DailyTrendPoint[] | null> {
  const record = await getDailyTrendRecord(monthId);
  return record?.points ?? null;
}

export async function setDailyTrendOverrides(
  monthId: number,
  points: DailyTrendPoint[],
  promo?: DailyTrendPromoConfig
): Promise<void> {
  const daysInMonth = points.length;
  await setDailyTrendRecord(monthId, {
    promo: normalizePromo(promo, daysInMonth),
    points,
  });
}
