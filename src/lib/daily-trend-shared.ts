export interface DailyTrendPoint {
  day: number;
  clicks: number;
  conversions: number;
}

export interface DailyTrendPromoConfig {
  promoStartDay: number;
  promoEndDay: number;
}

export interface DailyTrendRecord {
  promo: DailyTrendPromoConfig;
  points: DailyTrendPoint[];
}

export interface WeekdayChartPoint {
  day: string;
  impressions: number;
}

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function daysInReportMonth(
  reportMonth: string,
  dateRange?: string | null
): number {
  const rangeEnd = dateRange?.match(/-\s*\w+\s+(\d{1,2}),?\s*(\d{4})/i);
  if (rangeEnd) {
    const endDay = Number(rangeEnd[1]);
    if (endDay >= 28 && endDay <= 31) return endDay;
  }

  const parts = reportMonth.trim().split(/\s+/);
  if (parts.length >= 2) {
    const monthIndex = MONTH_MAP[parts[0].toLowerCase()];
    const year = Number(parts[1]);
    if (monthIndex !== undefined && Number.isFinite(year)) {
      return new Date(year, monthIndex + 1, 0).getDate();
    }
  }

  return 30;
}

/** 優惠期超過此天數時改為全月平均分佈（1–30／1–31） */
export const LONG_PROMO_DAY_THRESHOLD = 24;

export function promoDayCount(promo: DailyTrendPromoConfig): number {
  return Math.max(0, promo.promoEndDay - promo.promoStartDay + 1);
}

export function isLongPromoRange(promo: DailyTrendPromoConfig): boolean {
  return promoDayCount(promo) > LONG_PROMO_DAY_THRESHOLD;
}

export function fullMonthPromoRange(daysInMonth: number): DailyTrendPromoConfig {
  return { promoStartDay: 1, promoEndDay: daysInMonth };
}

export function defaultPromoRange(daysInMonth: number): DailyTrendPromoConfig {
  const span = Math.max(5, Math.round(daysInMonth * 0.35));
  const start = Math.max(1, Math.round(daysInMonth * 0.28));
  const end = Math.min(daysInMonth, start + span - 1);
  return { promoStartDay: start, promoEndDay: end };
}

function isInPromo(day: number, promo: DailyTrendPromoConfig): boolean {
  return day >= promo.promoStartDay && day <= promo.promoEndDay;
}

function distributeByWeights(
  total: number,
  weights: number[],
  decimals = 0
): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0) || 1;
  let remaining = total;
  const factor = decimals > 0 ? 10 ** decimals : 1;

  return weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    if (isLast) {
      return decimals > 0
        ? Math.round(remaining * factor) / factor
        : remaining;
    }
    const raw = (weight / sum) * total;
    const value =
      decimals > 0
        ? Math.max(0, Math.round(raw * factor) / factor)
        : Math.max(0, Math.round(raw));
    remaining -= value;
    return value;
  });
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DAY_ALIASES: Record<string, string> = {
  sun: "Sunday",
  sunday: "Sunday",
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
};

function normalizeWeekdayName(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\./g, "");
  return DAY_ALIASES[key] || raw.trim();
}

export function getMonthStartWeekday(reportMonth: string): number {
  const parts = reportMonth.trim().split(/\s+/);
  if (parts.length >= 2) {
    const monthIndex = MONTH_MAP[parts[0].toLowerCase()];
    const year = Number(parts[1]);
    if (monthIndex !== undefined && Number.isFinite(year)) {
      return new Date(year, monthIndex, 1).getDay();
    }
  }
  return 0;
}

export function getWeekdayNameForDay(
  reportMonth: string,
  calendarDay: number
): string {
  const start = getMonthStartWeekday(reportMonth);
  return WEEKDAY_NAMES[(start + calendarDay - 1) % 7];
}

export function buildWeekdayWeightMap(
  weekdayChart: WeekdayChartPoint[] | undefined
): Record<string, number> {
  if (!weekdayChart || weekdayChart.length === 0) {
    return Object.fromEntries(WEEKDAY_NAMES.map((day) => [day, 1 / 7]));
  }

  const totals = new Map<string, number>();
  for (const row of weekdayChart) {
    const name = normalizeWeekdayName(row.day);
    totals.set(name, (totals.get(name) || 0) + row.impressions);
  }

  const sum = Array.from(totals.values()).reduce((acc, v) => acc + v, 0) || 1;
  const map = Object.fromEntries(WEEKDAY_NAMES.map((day) => [day, 0]));

  for (const [day, value] of totals.entries()) {
    if (day in map) {
      map[day] = value / sum;
    }
  }

  const missing = WEEKDAY_NAMES.filter((day) => map[day] === 0);
  if (missing.length > 0) {
    const fallback = (1 - Object.values(map).reduce((a, b) => a + b, 0)) / missing.length;
    for (const day of missing) {
      map[day] = fallback;
    }
  }

  return map;
}

/** 閃電式尖峰係數：避免平滑漸進，呈現突兀升降 */
function lightningSpike(day: number, metric: "clicks" | "conversions"): number {
  const phase = (day * (metric === "clicks" ? 5 : 7) + 3) % 11;
  const zigzag =
    day % 2 === 0
      ? phase > 7
        ? 2.4
        : phase < 3
          ? 0.35
          : 1.15
      : phase > 8
        ? 0.4
        : phase < 2
          ? 2.1
          : 0.9;

  const burst = (day * 13 + (metric === "clicks" ? 2 : 5)) % 6 === 0 ? 1.85 : 1;
  const dip = (day * 17 + 4) % 9 === 0 ? 0.42 : 1;

  return zigzag * burst * dip;
}

export interface GenerateDailyTrendContext {
  weekdayChart?: WeekdayChartPoint[];
  reportMonth?: string;
  totalImpressions?: number;
  ctr?: number;
  convRate?: number;
}

function promoPriorityMultiplier(
  day: number,
  promo: DailyTrendPromoConfig,
  layer: "traffic" | "ctr" | "conversion"
): number {
  const inPromo = isInPromo(day, promo);
  if (inPromo) {
    if (layer === "traffic") return 1.55;
    if (layer === "ctr") return 1.3;
    return 1.5;
  }
  // 優惠期外仍有起伏，只是整體低於優惠期
  if (layer === "traffic") return 0.78;
  if (layer === "ctr") return 0.88;
  return 0.52;
}

function weekdayInfluence(weight: number): number {
  return 0.72 + weight * 0.56;
}

function lightningSpikeForDay(
  day: number,
  metric: "clicks" | "conversions",
  inPromo: boolean
): number {
  const spike = lightningSpike(day, metric);
  if (inPromo) return spike;
  // 非優惠日保留閃電起伏，僅略為收斂
  return 0.65 + spike * 0.55;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDayAxisLabel(
  reportMonth: string,
  calendarDay: number
): string {
  const safeMonth =
    typeof reportMonth === "string" && reportMonth.trim()
      ? reportMonth.trim()
      : "January 2026";
  const parts = safeMonth.split(/\s+/);
  const monthKey = parts[0]?.toLowerCase() || "";
  const monthIndex = MONTH_MAP[monthKey];
  const monthShort =
    monthIndex !== undefined
      ? MONTH_SHORT[monthIndex]
      : (parts[0] || "Jan").slice(0, 3);
  const weekdayShort = getWeekdayNameForDay(safeMonth, calendarDay).slice(0, 3);
  return `${calendarDay} ${monthShort} (${weekdayShort})`;
}

function effectiveCtrForDay(
  baseCtr: number,
  day: number,
  promo: DailyTrendPromoConfig
): number {
  const inPromo = isInPromo(day, promo);
  const promoMult = promoPriorityMultiplier(day, promo, "ctr");
  const spike = lightningSpikeForDay(day, "clicks", inPromo);
  return Math.max(0.12, baseCtr * promoMult * spike);
}

function effectiveConvRateForDay(
  baseConvRate: number,
  day: number,
  promo: DailyTrendPromoConfig
): number {
  const inPromo = isInPromo(day, promo);
  const promoMult = promoPriorityMultiplier(day, promo, "conversion");
  const spike = lightningSpikeForDay(day, "conversions", inPromo);
  return Math.max(0.08, baseConvRate * promoMult * spike);
}

export function generateDefaultDailyTrend(
  totalClicks: number,
  totalConversions: number,
  daysInMonth: number,
  promo: DailyTrendPromoConfig = defaultPromoRange(daysInMonth),
  context: GenerateDailyTrendContext = {}
): DailyTrendPoint[] {
  const resolvedPromo = normalizePromo(promo, daysInMonth);
  // 優惠期超過 24 日：normalize 為全月，平均分佈至 1–30／1–31
  if (isLongPromoRange(resolvedPromo)) {
    return generateAverageDailyTrend(
      totalClicks,
      totalConversions,
      daysInMonth,
      context
    );
  }

  const weekdayWeights = buildWeekdayWeightMap(context.weekdayChart);
  const reportMonth = context.reportMonth || "January 2026";
  const totalImpressions = Math.max(0, context.totalImpressions ?? 0);
  const baseCtr =
    context.ctr && context.ctr > 0
      ? context.ctr
      : totalImpressions > 0
        ? (totalClicks / totalImpressions) * 100
        : 2.5;
  const baseConvRate =
    context.convRate && context.convRate > 0
      ? context.convRate
      : totalClicks > 0
        ? (totalConversions / totalClicks) * 100
        : 1.2;

  const impressionWeights = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const inPromo = isInPromo(day, resolvedPromo);
    const weekday = getWeekdayNameForDay(reportMonth, day);
    const weekdayWeight = weekdayWeights[weekday] ?? 1 / 7;
    const promoMult = promoPriorityMultiplier(day, resolvedPromo, "traffic");
    const weekdayMult = weekdayInfluence(weekdayWeight);
    const spike = lightningSpikeForDay(day, "clicks", inPromo);
    return Math.max(0.08, promoMult * weekdayMult * spike);
  });

  const dailyImpressions =
    totalImpressions > 0
      ? distributeByWeights(totalImpressions, impressionWeights, 0)
      : impressionWeights;

  const clickWeights = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const impressions =
      totalImpressions > 0 ? dailyImpressions[index] : impressionWeights[index];
    const dayCtr = effectiveCtrForDay(baseCtr, day, resolvedPromo);
    return Math.max(0.01, impressions * (dayCtr / 100));
  });

  const clicks = distributeByWeights(totalClicks, clickWeights, 0);

  const conversionWeights = clicks.map((clickValue, index) => {
    const day = index + 1;
    const dayConvRate = effectiveConvRateForDay(baseConvRate, day, resolvedPromo);
    return Math.max(0.001, clickValue * (dayConvRate / 100));
  });

  const conversions = distributeByWeights(totalConversions, conversionWeights, 1);

  return clicks.map((clickValue, index) => ({
    day: index + 1,
    clicks: clickValue,
    conversions: conversions[index],
  }));
}

/** 平均模式用輕微起伏，避免某一日因公式巧合變成極端尖峰 */
function mildDailyVariation(day: number, metric: "clicks" | "conversions"): number {
  const phase = metric === "clicks" ? 0.37 : 1.13;
  const wave =
    Math.sin(day * 0.9 + phase) * 0.1 + Math.sin(day * 0.31 + phase * 2) * 0.06;
  return Math.max(0.85, Math.min(1.15, 1 + wave));
}

/** 平均趨勢：各日接近均衡分配，不區分優惠期，只保留輕微波浪 */
export function generateAverageDailyTrend(
  totalClicks: number,
  totalConversions: number,
  daysInMonth: number,
  context: GenerateDailyTrendContext = {}
): DailyTrendPoint[] {
  const weekdayWeights = buildWeekdayWeightMap(context.weekdayChart);
  const reportMonth = context.reportMonth || "January 2026";

  function mildWeekdayInfluence(weight: number): number {
    // 星期影響縮得更細，避免某一星期日長期霸佔高峰
    return 0.96 + weight * 0.08;
  }

  const clickWeights = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const weekday = getWeekdayNameForDay(reportMonth, day);
    const weekdayWeight = weekdayWeights[weekday] ?? 1 / 7;
    const weekdayMult = mildWeekdayInfluence(weekdayWeight);
    const variation = mildDailyVariation(day, "clicks");
    return Math.max(0.7, weekdayMult * variation);
  });

  const clicks = distributeByWeights(totalClicks, clickWeights, 0);

  const conversionWeights = clicks.map((clickValue, index) => {
    const day = index + 1;
    const variation = mildDailyVariation(day, "conversions");
    return Math.max(0.5, clickValue * variation);
  });

  const conversions = distributeByWeights(totalConversions, conversionWeights, 1);

  return clicks.map((clickValue, index) => ({
    day: index + 1,
    clicks: clickValue,
    conversions: conversions[index],
  }));
}

function normalizePoints(points: DailyTrendPoint[]): DailyTrendPoint[] {
  return points
    .map((point) => ({
      day: Number(point.day),
      clicks: Math.max(0, Math.round(Number(point.clicks) || 0)),
      conversions: Math.max(
        0,
        Math.round((Number(point.conversions) || 0) * 10) / 10
      ),
    }))
    .filter((point) => point.day >= 1)
    .sort((a, b) => a.day - b.day);
}

export function normalizePromo(
  promo: Partial<DailyTrendPromoConfig> | undefined,
  daysInMonth: number
): DailyTrendPromoConfig {
  const defaults = defaultPromoRange(daysInMonth);
  const start = Math.max(
    1,
    Math.min(
      daysInMonth,
      Math.round(Number(promo?.promoStartDay) || defaults.promoStartDay)
    )
  );
  const end = Math.max(
    start,
    Math.min(
      daysInMonth,
      Math.round(Number(promo?.promoEndDay) || defaults.promoEndDay)
    )
  );
  const clipped = { promoStartDay: start, promoEndDay: end };
  // 超過 24 日改為涵蓋全月，配合平均分佈
  if (isLongPromoRange(clipped)) {
    return fullMonthPromoRange(daysInMonth);
  }
  return clipped;
}

export function parseDailyTrendRecord(
  raw: string | null | undefined
): DailyTrendRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as
      | DailyTrendRecord
      | DailyTrendPoint[]
      | { points?: DailyTrendPoint[]; promo?: DailyTrendPromoConfig };

    if (Array.isArray(parsed)) {
      const points = normalizePoints(parsed);
      if (points.length === 0) return null;
      return {
        promo: defaultPromoRange(points.length),
        points,
      };
    }

    const points = normalizePoints(parsed.points || []);
    if (points.length === 0) return null;

    return {
      promo: normalizePromo(parsed.promo, points.length),
      points,
    };
  } catch {
    return null;
  }
}

export function parseWeekdayChart(
  raw: string | null | undefined
): WeekdayChartPoint[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeekdayChartPoint[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((row) => ({
      day: String(row.day),
      impressions: Math.max(0, Math.round(Number(row.impressions) || 0)),
    }));
  } catch {
    return null;
  }
}

export function validateDailyTrend(
  points: DailyTrendPoint[],
  daysInMonth: number
): string | null {
  if (points.length !== daysInMonth) {
    return `請提供 ${daysInMonth} 天的數據（1-${daysInMonth} 日）`;
  }

  for (let i = 0; i < daysInMonth; i++) {
    if (points[i].day !== i + 1) {
      return `第 ${i + 1} 天資料順序不正確`;
    }
    if (points[i].clicks < 0 || points[i].conversions < 0) {
      return "數值不可為負數";
    }
  }

  return null;
}

export function validatePromo(
  promo: DailyTrendPromoConfig,
  daysInMonth: number
): string | null {
  if (promo.promoStartDay < 1 || promo.promoEndDay > daysInMonth) {
    return `優惠範圍需介於 1 至 ${daysInMonth} 日`;
  }
  if (promo.promoStartDay > promo.promoEndDay) {
    return "優惠開始日不可晚於結束日";
  }
  return null;
}
