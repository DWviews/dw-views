import {
  parseAllCSVs,
  type CampaignData,
  type CompetitorRow,
  type DayData,
  type DemographicRow,
  type DeviceRow,
  type LocationRow,
  type ParsedCSVs,
} from "./csv-parser";

const DAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type RandomizeSection =
  | "weekday"
  | "audience"
  | "device"
  | "location"
  | "auction"
  | "dailyTrend";

export const RANDOMIZE_SECTIONS: RandomizeSection[] = [
  "weekday",
  "audience",
  "device",
  "location",
  "auction",
  "dailyTrend",
];

function vary(base: number, pct = 0.05): number {
  if (base === 0) return 0;
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return base * factor;
}

function roundInt(n: number): number {
  return Math.max(0, Math.round(n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeSimilarityPct(value: number): number {
  return clamp(Number.isFinite(value) ? value : 85, 0, 100);
}

function similarityRatio(similarityPct: number): number {
  return normalizeSimilarityPct(similarityPct) / 100;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(n: number): string {
  return `${round2(n).toFixed(2)}%`;
}

function formatHkd(n: number): string {
  return `"HK$${formatNum(round2(n))}"`;
}

function distributeByWeights(
  total: number,
  weights: number[],
  decimals = 0
): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
  let remaining = total;
  const factor = decimals > 0 ? 10 ** decimals : 1;

  return weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    if (isLast) {
      return decimals > 0
        ? Math.max(0, Math.round(remaining * factor) / factor)
        : Math.max(0, Math.round(remaining));
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

function blendedWeights(baseValues: number[], similarityPct: number): number[] {
  const similarity = similarityRatio(similarityPct);
  const total = baseValues.reduce((sum, value) => sum + Math.max(0, value), 0);
  const fallback = baseValues.length > 0 ? 1 / baseValues.length : 1;

  return baseValues.map((value) => {
    const baseWeight = total > 0 ? Math.max(0, value) / total : fallback;
    const randomWeight = 0.08 + Math.random() * 1.84;
    return Math.max(0.001, baseWeight * similarity + randomWeight * (1 - similarity));
  });
}

function scaleRows<T extends { impressions: number }>(
  rows: T[],
  targetTotal: number
): T[] {
  const current = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (current === 0 || rows.length === 0) return rows;
  const factor = targetTotal / current;
  const scaled = rows.map((row) => ({
    ...row,
    impressions: roundInt(row.impressions * factor),
  }));
  const diff = targetTotal - scaled.reduce((sum, row) => sum + row.impressions, 0);
  if (diff !== 0 && scaled.length > 0) {
    scaled[0] = { ...scaled[0], impressions: scaled[0].impressions + diff };
  }
  return scaled;
}

export function parseReportMonthLabel(label: string): Date | null {
  const parsed = Date.parse(`${label} 1`);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function nextReportMonthLabel(current: string): string {
  const date = parseReportMonthLabel(current);
  if (!date) {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  date.setMonth(date.getMonth() + 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Calendar month immediately before the given report month label (e.g. July 2026 → June 2026). */
export function previousReportMonthLabel(current: string): string | null {
  const date = parseReportMonthLabel(current);
  if (!date) return null;
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function sameReportMonth(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  if (a.trim() === b.trim()) return true;
  const da = parseReportMonthLabel(a);
  const db = parseReportMonthLabel(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
  );
}

export function nextDateRangeLabel(current: string | null | undefined): string {
  const date = current ? parseReportMonthLabel(current) : null;
  const base = date || new Date();
  const start = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 2, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} - ${fmt(end)}`;
}

export interface GeneratedMonthData {
  reportMonth: string;
  reportDateRange: string;
  parsed: ParsedCSVs;
  files: Record<string, string>;
}

function generateCampaign(
  base: CampaignData,
  campaignName: string,
  dateRange: string
): CampaignData {
  const impressions = roundInt(vary(base.impressions));
  const ctr = round2(vary(base.ctr));
  const clicks = roundInt((impressions * ctr) / 100);
  const actualCtr = impressions > 0 ? round2((clicks / impressions) * 100) : 0;

  const convRate = round2(vary(base.convRate));
  const conversions = round2((clicks * convRate) / 100);
  const actualConvRate = clicks > 0 ? round2((conversions / clicks) * 100) : 0;

  const baseCostPerConv =
    base.conversions > 0 ? base.cost / base.conversions : base.cost;
  const cost = round2(conversions * vary(baseCostPerConv));

  return {
    campaign: campaignName || base.campaign,
    cost,
    clicks,
    impressions,
    ctr: actualCtr,
    convRate: actualConvRate,
    conversions,
    dateRange,
  };
}

function generateDays(baseDays: DayData[], totalImpressions: number): DayData[] {
  const varied = DAY_ORDER.map((day) => {
    const existing = baseDays.find((d) => d.day === day);
    return {
      day,
      impressions: roundInt(vary(existing?.impressions || 0)),
    };
  });
  return scaleRows(varied, totalImpressions);
}

function generateDemographics(
  baseRows: DemographicRow[],
  totalImpressions: number
): DemographicRow[] {
  const varied = baseRows.map((row) => ({
    gender: row.gender,
    ageRange: row.ageRange,
    impressions: roundInt(vary(row.impressions)),
    percent: 0,
  }));
  const scaled = scaleRows(varied, totalImpressions);
  const total = scaled.reduce((sum, row) => sum + row.impressions, 0);
  return scaled.map((row) => ({
    ...row,
    percent: total > 0 ? round2((row.impressions / total) * 100) : 0,
  }));
}

function generateDevices(baseDevices: DeviceRow[]): DeviceRow[] {
  return baseDevices.map((device) => {
    if (device.device === "TV screens") {
      return { ...device, cost: 0, clicks: 0, conversions: 0 };
    }
    const clicks = roundInt(vary(device.clicks));
    const conversions = round2(vary(device.conversions));
    const cost = round2(vary(device.cost));
    const impressions = device.impressions
      ? roundInt(vary(device.impressions))
      : undefined;
    return { ...device, clicks, conversions, cost, impressions };
  });
}

function generateLocations(
  baseLocations: LocationRow[],
  totalImpressions: number
): LocationRow[] {
  const varied = baseLocations.map((row) => ({
    location: row.location,
    impressions: roundInt(vary(row.impressions)),
  }));
  return scaleRows(varied, totalImpressions);
}

function generateCompetitors(baseRows: CompetitorRow[]): CompetitorRow[] {
  return baseRows.map((row) => {
    const varyShare = (value: number) => {
      if (value <= 0) return value;
      return round2(Math.min(99.99, Math.max(0.01, vary(value))));
    };
    return {
      name: row.name,
      impressionShare: varyShare(row.impressionShare),
      topOfPageRate: varyShare(row.topOfPageRate),
      outrankingShare: varyShare(row.outrankingShare),
    };
  });
}

function campaignFromMetrics(
  base: CampaignData | null,
  campaignName: string,
  dateRange: string,
  metrics: MonthMetricsInput
): CampaignData {
  const impressions = roundInt(metrics.impressions);
  const clicks = roundInt(metrics.clicks);
  const conversions = round2(metrics.conversions);
  const ctr = impressions > 0 ? round2((clicks / impressions) * 100) : round2(metrics.ctr);
  const convRate =
    clicks > 0 ? round2((conversions / clicks) * 100) : round2(metrics.convRate);

  return {
    campaign: campaignName || base?.campaign || "Campaign",
    cost: round2(metrics.cost),
    clicks,
    impressions,
    ctr,
    convRate,
    conversions,
    dateRange: dateRange || base?.dateRange || "",
  };
}

function randomizeDays(
  baseDays: DayData[],
  totalImpressions: number,
  similarityPct: number
): DayData[] {
  const baseByDay = new Map(baseDays.map((day) => [day.day, day.impressions]));
  const weights = blendedWeights(
    DAY_ORDER.map((day) => baseByDay.get(day) || 0),
    similarityPct
  );
  const impressions = distributeByWeights(totalImpressions, weights, 0);

  return DAY_ORDER.map((day, index) => ({
    day,
    impressions: impressions[index],
  }));
}

function randomizeDemographics(
  baseRows: DemographicRow[],
  totalImpressions: number,
  similarityPct: number
): DemographicRow[] {
  const weights = blendedWeights(
    baseRows.map((row) => row.impressions),
    similarityPct
  );
  const impressions = distributeByWeights(totalImpressions, weights, 0);
  const total = impressions.reduce((sum, value) => sum + value, 0);

  return baseRows.map((row, index) => ({
    gender: row.gender,
    ageRange: row.ageRange,
    impressions: impressions[index],
    percent: total > 0 ? round2((impressions[index] / total) * 100) : 0,
  }));
}

function randomizeDevices(
  baseDevices: DeviceRow[],
  metrics: MonthMetricsInput,
  similarityPct: number
): DeviceRow[] {
  const devices =
    baseDevices.length > 0
      ? baseDevices
      : [
          { device: "Computers", cost: 0, clicks: 0, conversions: 0 },
          { device: "Mobile phones", cost: 0, clicks: 0, conversions: 0 },
          { device: "Tablets", cost: 0, clicks: 0, conversions: 0 },
        ];

  const clickWeights = blendedWeights(
    devices.map((device) => device.clicks),
    similarityPct
  );
  const clicks = distributeByWeights(metrics.clicks, clickWeights, 0);

  const conversionWeights = devices.map((device, index) => {
    const deviceConvRate =
      device.clicks > 0
        ? device.conversions / device.clicks
        : metrics.clicks > 0
          ? metrics.conversions / metrics.clicks
          : 0;
    const similarity = similarityRatio(similarityPct);
    const randomConvRate = 0.002 + Math.random() * 0.04;
    const blendedConvRate =
      deviceConvRate * similarity + randomConvRate * (1 - similarity);
    return Math.max(0.001, clicks[index] * blendedConvRate);
  });
  const conversions = distributeByWeights(
    metrics.conversions,
    conversionWeights,
    2
  );

  const costWeights = devices.map((device, index) => {
    const deviceCpc =
      device.clicks > 0
        ? device.cost / device.clicks
        : metrics.clicks > 0
          ? metrics.cost / metrics.clicks
          : 0;
    const similarity = similarityRatio(similarityPct);
    const randomCpc = 0.5 + Math.random() * 4.5;
    const blendedCpc = deviceCpc * similarity + randomCpc * (1 - similarity);
    return Math.max(0.01, clicks[index] * blendedCpc);
  });
  const costs = distributeByWeights(metrics.cost, costWeights, 2);

  const campaignCtr =
    metrics.impressions > 0 && metrics.clicks > 0
      ? metrics.clicks / metrics.impressions
      : 0;
  const impressionWeights = blendedWeights(
    devices.map((device) =>
      device.impressions && device.impressions > 0 ? device.impressions : device.clicks
    ),
    similarityPct
  );
  const impressions =
    metrics.impressions > 0
      ? distributeByWeights(metrics.impressions, impressionWeights, 0)
      : clicks.map((clickValue) =>
          campaignCtr > 0 ? roundInt(clickValue / campaignCtr) : 0
        );

  return devices.map((device, index) => ({
    device: device.device,
    clicks: clicks[index],
    conversions: conversions[index],
    cost: costs[index],
    impressions: impressions[index],
  }));
}

function randomizeLocations(
  baseLocations: LocationRow[],
  totalImpressions: number,
  similarityPct: number
): LocationRow[] {
  const weights = blendedWeights(
    baseLocations.map((row) => row.impressions),
    similarityPct
  );
  const impressions = distributeByWeights(totalImpressions, weights, 0);

  return baseLocations.map((row, index) => ({
    location: row.location,
    impressions: impressions[index],
  }));
}

function randomizePercent(base: number, similarityPct: number): number {
  const similarity = similarityRatio(similarityPct);
  const randomValue = 0.01 + Math.random() * 99.98;
  return round2(clamp(base * similarity + randomValue * (1 - similarity), 0.01, 99.99));
}

function randomizeCompetitors(
  baseRows: CompetitorRow[],
  similarityPct: number
): CompetitorRow[] {
  return baseRows.map((row) => ({
    name: row.name,
    impressionShare: randomizePercent(row.impressionShare, similarityPct),
    topOfPageRate: randomizePercent(row.topOfPageRate, similarityPct),
    outrankingShare: randomizePercent(row.outrankingShare, similarityPct),
  }));
}

function serialize01(campaign: CampaignData): string {
  const avgCpc = campaign.clicks > 0 ? round2(campaign.cost / campaign.clicks) : 0;
  const costPerConv =
    campaign.conversions > 0 ? round2(campaign.cost / campaign.conversions) : 0;
  const headers = [
    "Campaign",
    "Cost",
    "Clicks",
    "Avg. CPC",
    "Impr.",
    "CTR",
    "Conv. rate",
    "Conversions",
    "Cost / conv.",
  ];
  const values = [
    campaign.campaign,
    formatHkd(campaign.cost),
    formatNum(campaign.clicks),
    formatHkd(avgCpc),
    formatNum(campaign.impressions),
    formatPct(campaign.ctr),
    formatPct(campaign.convRate),
    formatNum(campaign.conversions),
    formatHkd(costPerConv),
  ];
  return [
    "Campaign report",
    `"${campaign.dateRange}"`,
    headers.join("\t"),
    values.join("\t"),
  ].join("\n");
}

function serialize02(days: DayData[]): string {
  return [
    "Day,Impressions",
    ...days.map((d) => `${d.day},"${formatNum(d.impressions)}"`),
  ].join("\n");
}

function serialize03(rows: DemographicRow[]): string {
  return [
    "Gender,Age Range,Impressions,Percent of known total",
    ...rows.map(
      (row) =>
        `${row.gender},${row.ageRange},"${formatNum(row.impressions)}",${row.percent.toFixed(2)}%`
    ),
  ].join("\n");
}

function serialize04(devices: DeviceRow[]): string {
  return [
    "Device,Cost,Clicks,Conversions",
    ...devices.map(
      (d) =>
        `${d.device},${formatHkd(d.cost)},${formatNum(d.clicks)},${formatNum(d.conversions)}`
    ),
  ].join("\n");
}

function serialize05(locations: LocationRow[]): string {
  return [
    "Location Name,Impressions",
    ...locations.map((l) => `${l.location},"${formatNum(l.impressions)}"`),
  ].join("\n");
}

function serialize06(rows: CompetitorRow[]): string {
  const headers = [
    "Advertiser Name",
    "Impression share",
    "Impression share (Comparison)",
    "Outranking share",
    "Outranking share (Comparison)",
    "Overlap rate",
    "Overlap rate (Comparison)",
    "Top of page rate",
    "Top of page rate (Comparison)",
    "Position above rate",
    "Position above rate (Comparison)",
  ];
  const lines = rows.map((row) => {
    const share =
      row.impressionShare < 10 && row.name !== "You"
        ? "< 10%"
        : formatPct(row.impressionShare);
    return [
      row.name,
      share,
      share,
      formatPct(row.outrankingShare),
      formatPct(row.outrankingShare),
      "No data",
      "No data",
      formatPct(row.topOfPageRate),
      formatPct(row.topOfPageRate),
      "No data",
      "No data",
    ].join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

export interface MonthMetricsInput {
  clicks: number;
  impressions: number;
  ctr: number;
  convRate: number;
  cost: number;
  conversions: number;
}

export type MetricBiasSetting = "auto" | "higher" | "lower";

export interface MetricBiasSettings {
  clicks?: MetricBiasSetting;
  impressions?: MetricBiasSetting;
  ctr?: MetricBiasSetting;
  convRate?: MetricBiasSetting;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function biasMultiplier(setting: MetricBiasSetting | undefined): number {
  if (setting === "higher") return 1.18;
  if (setting === "lower") return 0.82;
  return 1;
}

function similarityAmplitude(similarityPct: number): number {
  return 0.06 + ((100 - normalizeSimilarityPct(similarityPct)) / 100) * 0.28;
}

export function validateMonthMetrics(
  metrics: Partial<MonthMetricsInput>
): string | null {
  const fields: (keyof MonthMetricsInput)[] = [
    "clicks",
    "impressions",
    "ctr",
    "convRate",
    "cost",
    "conversions",
  ];
  for (const field of fields) {
    const value = metrics[field];
    if (value === undefined || value === null || Number.isNaN(value)) {
      return `缺少欄位: ${field}`;
    }
    if (value < 0) {
      return `${field} 不可為負數`;
    }
  }
  if ((metrics.ctr ?? 0) > 100 || (metrics.convRate ?? 0) > 100) {
    return "CTR 與轉換率不可超過 100%";
  }
  return null;
}

export function metricsFromCampaign(
  campaign: CampaignData
): MonthMetricsInput {
  return {
    clicks: campaign.clicks,
    impressions: campaign.impressions,
    ctr: campaign.ctr,
    convRate: campaign.convRate,
    cost: campaign.cost,
    conversions: campaign.conversions,
  };
}

/** 依費用、相似度與高低設定推算 KPI */
export function metricsFromCost(
  base: MonthMetricsInput,
  newCost: number,
  similarityPct = 85,
  bias: MetricBiasSettings = {}
): MonthMetricsInput {
  const cost = round2(Math.max(0, newCost));
  const baseCtr =
    base.ctr > 0
      ? base.ctr
      : base.impressions > 0
        ? round2((base.clicks / base.impressions) * 100)
        : 0;
  const baseConvRate =
    base.convRate > 0
      ? base.convRate
      : base.clicks > 0
        ? round2((base.conversions / base.clicks) * 100)
        : 0;
  const baseCpc = base.clicks > 0 ? base.cost / base.clicks : 0;
  const amplitude = similarityAmplitude(similarityPct);
  const ctrRandom = randomRange(1 - amplitude, 1 + amplitude);
  const convRateRandom = randomRange(1 - amplitude, 1 + amplitude);
  const cpcRandom = randomRange(1 - amplitude, 1 + amplitude);
  const impressionRandom = randomRange(1 - amplitude * 0.8, 1 + amplitude * 0.8);

  const targetCpc =
    baseCpc > 0
      ? baseCpc * cpcRandom / biasMultiplier(bias.clicks)
      : 0;
  const clicks =
    targetCpc > 0
      ? roundInt(cost / targetCpc)
      : roundInt(base.clicks);

  const targetCtr = clamp(
    baseCtr * biasMultiplier(bias.ctr) * ctrRandom,
    0.05,
    100
  );
  const baseImpressionsFromCtr =
    targetCtr > 0 ? (clicks / targetCtr) * 100 : base.impressions;
  const impressions = roundInt(
    baseImpressionsFromCtr *
      biasMultiplier(bias.impressions) *
      impressionRandom
  );

  const targetConvRate = clamp(
    baseConvRate * biasMultiplier(bias.convRate) * convRateRandom,
    0.05,
    100
  );
  const conversions = round2((clicks * targetConvRate) / 100);

  if (base.cost <= 0) {
    return normalizeMetrics({
      clicks,
      impressions,
      ctr: targetCtr,
      convRate: targetConvRate,
      cost,
      conversions,
    });
  }

  return normalizeMetrics({
    clicks,
    impressions,
    ctr: targetCtr,
    convRate: targetConvRate,
    cost,
    conversions,
  });
}

/** 確保 CTR = Clicks÷Impressions、轉換率 = Conversions÷Clicks */
export function normalizeMetrics(metrics: MonthMetricsInput): MonthMetricsInput {
  const cost = round2(metrics.cost);
  const clicks = roundInt(metrics.clicks);
  const impressions = roundInt(metrics.impressions);
  const targetCtr =
    metrics.ctr > 0
      ? metrics.ctr
      : impressions > 0
        ? round2((clicks / impressions) * 100)
        : 0;
  const targetConvRate =
    metrics.convRate > 0
      ? metrics.convRate
      : clicks > 0
        ? round2((metrics.conversions / clicks) * 100)
        : 0;
  const conversions = round2((clicks * targetConvRate) / 100);

  return {
    clicks,
    impressions,
    ctr:
      impressions > 0
        ? round2((clicks / impressions) * 100)
        : round2(targetCtr),
    convRate:
      clicks > 0
        ? round2((conversions / clicks) * 100)
        : round2(targetConvRate),
    cost,
    conversions,
  };
}

export function applyMetricsUpdate(
  sourceFiles: Record<string, string>,
  campaignName: string,
  dateRange: string,
  metrics: MonthMetricsInput
): Record<string, string> {
  const base = parseAllCSVs(sourceFiles);
  const oldImpressions = base.campaign?.impressions ?? 0;
  const campaign: CampaignData = {
    campaign: campaignName || base.campaign?.campaign || "Campaign",
    dateRange: dateRange || base.campaign?.dateRange || dateRange,
    clicks: roundInt(metrics.clicks),
    impressions: roundInt(metrics.impressions),
    ctr: round2(metrics.ctr),
    convRate: round2(metrics.convRate),
    cost: round2(metrics.cost),
    conversions: round2(metrics.conversions),
  };

  let days = base.days;
  let demographics = base.demographics;
  let locations = base.locations;

  if (
    campaign.impressions !== oldImpressions &&
    campaign.impressions > 0
  ) {
    if (days.length > 0) {
      days = scaleRows(days, campaign.impressions);
    }
    if (demographics.length > 0) {
      const scaled = scaleRows(demographics, campaign.impressions);
      const total = scaled.reduce((sum, row) => sum + row.impressions, 0);
      demographics = scaled.map((row) => ({
        ...row,
        percent: total > 0 ? round2((row.impressions / total) * 100) : 0,
      }));
    }
    if (locations.length > 0) {
      locations = scaleRows(locations, campaign.impressions);
    }
  }

  const files: Record<string, string> = {
    "01": serialize01(campaign),
  };
  if (sourceFiles["02"] && days.length > 0) files["02"] = serialize02(days);
  if (sourceFiles["03"] && demographics.length > 0) {
    files["03"] = serialize03(demographics);
  }
  if (sourceFiles["04"] && base.devices.length > 0) {
    files["04"] = serialize04(base.devices);
  }
  if (sourceFiles["05"] && locations.length > 0) {
    files["05"] = serialize05(locations);
  }
  if (sourceFiles["06"] && base.competitors.length > 0) {
    files["06"] = serialize06(base.competitors);
  }

  return files;
}

export interface RandomizeMonthDataOptions {
  similarityPct: number;
  sections?: RandomizeSection[];
  bias?: MetricBiasSettings;
}

export function generateRandomizedMonthData(
  sourceFiles: Record<string, string>,
  campaignName: string,
  reportMonth: string,
  reportDateRange: string | null | undefined,
  metrics: MonthMetricsInput,
  options: RandomizeMonthDataOptions
): GeneratedMonthData {
  const base = parseAllCSVs(sourceFiles);
  if (!base.campaign) {
    throw new Error("來源月份缺少 01.csv 活動績效資料");
  }

  const similarityPct = normalizeSimilarityPct(options.similarityPct);
  const enabled = new Set(options.sections?.length ? options.sections : RANDOMIZE_SECTIONS);
  const dateRange = reportDateRange || base.campaign.dateRange || reportMonth;
  const campaign = campaignFromMetrics(
    base.campaign,
    campaignName,
    dateRange,
    normalizeMetrics(metrics)
  );
  const normalizedMetrics = metricsFromCampaign(campaign);
  const scaled = applyMetricsUpdate(sourceFiles, campaignName, dateRange, metrics);

  const days = enabled.has("weekday")
    ? randomizeDays(base.days, campaign.impressions, similarityPct)
    : parseAllCSVs(scaled).days;
  const demographics = enabled.has("audience")
    ? randomizeDemographics(base.demographics, campaign.impressions, similarityPct)
    : parseAllCSVs(scaled).demographics;
  const devices = enabled.has("device")
    ? randomizeDevices(base.devices, normalizedMetrics, similarityPct)
    : parseAllCSVs(scaled).devices;
  const locations = enabled.has("location")
    ? randomizeLocations(base.locations, campaign.impressions, similarityPct)
    : parseAllCSVs(scaled).locations;
  const competitors = enabled.has("auction")
    ? randomizeCompetitors(base.competitors, similarityPct)
    : parseAllCSVs(scaled).competitors;

  const parsed: ParsedCSVs = {
    campaign,
    days,
    demographics,
    devices,
    locations,
    competitors,
  };

  const files: Record<string, string> = {
    "01": serialize01(campaign),
    "02": serialize02(days),
    "03": serialize03(demographics),
    "04": serialize04(devices),
    "05": serialize05(locations),
    "06": serialize06(competitors),
  };

  return { reportMonth, reportDateRange: dateRange, parsed, files };
}

export function generateNextMonthData(
  sourceFiles: Record<string, string>,
  campaignName: string,
  sourceReportMonth: string,
  sourceDateRange?: string | null
): GeneratedMonthData {
  const base = parseAllCSVs(sourceFiles);
  if (!base.campaign) {
    throw new Error("來源月份缺少 01.csv 活動績效資料");
  }

  const reportMonth = nextReportMonthLabel(sourceReportMonth);
  const reportDateRange = nextDateRangeLabel(sourceReportMonth);

  const campaign = generateCampaign(
    base.campaign,
    campaignName,
    reportDateRange
  );
  const days = generateDays(base.days, campaign.impressions);
  const demographics = generateDemographics(
    base.demographics,
    campaign.impressions
  );
  const devices = generateDevices(base.devices);
  const locations = generateLocations(base.locations, campaign.impressions);
  const competitors = generateCompetitors(base.competitors);

  const parsed: ParsedCSVs = {
    campaign,
    days,
    demographics,
    devices,
    locations,
    competitors,
  };

  const files: Record<string, string> = {
    "01": serialize01(campaign),
    "02": serialize02(days),
    "03": serialize03(demographics),
    "04": serialize04(devices),
    "05": serialize05(locations),
    "06": serialize06(competitors),
  };

  return { reportMonth, reportDateRange, parsed, files };
}

export function validateGeneratedMetrics(parsed: ParsedCSVs): string[] {
  const warnings: string[] = [];
  const c = parsed.campaign;
  if (!c) return ["缺少 campaign 資料"];

  const expectedCtr =
    c.impressions > 0 ? round2((c.clicks / c.impressions) * 100) : 0;
  const expectedConvRate =
    c.clicks > 0 ? round2((c.conversions / c.clicks) * 100) : 0;

  if (Math.abs(expectedCtr - c.ctr) > 0.05) {
    warnings.push(`CTR 不一致: 記錄 ${c.ctr}% vs 計算 ${expectedCtr}%`);
  }
  if (Math.abs(expectedConvRate - c.convRate) > 0.05) {
    warnings.push(
      `轉換率不一致: 記錄 ${c.convRate}% vs 計算 ${expectedConvRate}%`
    );
  }

  const dayTotal = parsed.days.reduce((sum, d) => sum + d.impressions, 0);
  if (Math.abs(dayTotal - c.impressions) > 2) {
    warnings.push(`每日曝光總和 ${dayTotal} 與活動曝光 ${c.impressions} 不符`);
  }

  const demoTotal = parsed.demographics.reduce(
    (sum, d) => sum + d.impressions,
    0
  );
  if (Math.abs(demoTotal - c.impressions) > 2) {
    warnings.push(`人口統計曝光總和 ${demoTotal} 與活動曝光 ${c.impressions} 不符`);
  }

  const locTotal = parsed.locations.reduce((sum, row) => sum + row.impressions, 0);
  if (locTotal > 0 && Math.abs(locTotal - c.impressions) > 2) {
    warnings.push(`地區曝光總和 ${locTotal} 與活動曝光 ${c.impressions} 不符`);
  }

  const deviceClicks = parsed.devices.reduce((sum, d) => sum + d.clicks, 0);
  if (deviceClicks > 0 && Math.abs(deviceClicks - c.clicks) > 1) {
    warnings.push(`裝置點擊總和 ${deviceClicks} 與活動點擊 ${c.clicks} 不符`);
  }

  const deviceCost = parsed.devices.reduce((sum, d) => sum + d.cost, 0);
  if (deviceCost > 0 && Math.abs(deviceCost - c.cost) > 0.05) {
    warnings.push(`裝置費用總和 ${deviceCost} 與活動費用 ${c.cost} 不符`);
  }

  return warnings;
}
