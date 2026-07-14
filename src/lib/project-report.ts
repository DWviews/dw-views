import { cache } from "react";
import { getSupabaseAdmin } from "./supabase";
import { parseAllCSVs, type DemographicRow, type DeviceRow } from "./csv-parser";
import { generateReport, type ReportData } from "./report-engine";
import { getKeywordRows } from "./project-keywords";
import type { KeywordRow } from "./keyword-types";
import {
  canViewMonth,
  parseMetricOverrides,
  getProjectMonthForProject,
  type ProjectMonthRecord,
} from "./project-months";
import { resolveProjectSlugCandidates } from "./project-slug";
import type { SessionUser } from "./auth";
import { loadMonthCsvFiles } from "./csv-files";
import {
  getWeekdayChartOverrides,
  resolveDailyTrend,
  type DailyTrendRecord,
  type WeekdayChartPoint,
} from "./daily-trend";

export interface ProjectRecord {
  id: number;
  name: string;
  slug: string;
  campaign_name: string;
  report_month: string;
  report_date_range: string | null;
  status: string;
}

export interface DashboardExtras {
  keywords: KeywordRow[];
  demographics: DemographicRow[];
  devices: DeviceRow[];
}

export interface ProjectMonthDashboardBundle {
  project: ProjectRecord;
  month: ProjectMonthRecord;
  report: ReportData;
  keywords: KeywordRow[];
  demographics: DemographicRow[];
  devices: DeviceRow[];
  weekdayChart: WeekdayChartPoint[];
  dailyTrend: DailyTrendRecord & { daysInMonth: number };
  csvFiles: string[];
}

/** 同一 request 內重複查詢時共用結果 */
export const getProjectBySlug = cache(
  async (slug: string): Promise<ProjectRecord | undefined> => {
    const supabase = getSupabaseAdmin();

    for (const candidate of resolveProjectSlugCandidates(slug)) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", candidate)
        .maybeSingle();

      if (error) throw error;
      if (data) return data as ProjectRecord;
    }
    return undefined;
  }
);

/** @deprecated 請改用 getProjectMonthDashboardBundle，避免重複解析 CSV */
export async function getProjectMonthDashboardExtras(
  monthId: number
): Promise<DashboardExtras> {
  const files = await loadMonthCsvFiles(monthId);
  const parsed = parseAllCSVs(files);
  return {
    keywords: await getKeywordRows(monthId),
    demographics: parsed.demographics,
    devices: parsed.devices,
  };
}

export async function getProjectMonthReport(
  slug: string,
  monthId: number,
  user: SessionUser
): Promise<{
  project: ProjectRecord | undefined;
  month: ProjectMonthRecord | undefined;
  csvFiles: string[];
  report: ReportData | null;
  forbidden: boolean;
  demographics?: DemographicRow[];
  devices?: DeviceRow[];
}> {
  const project = await getProjectBySlug(slug);
  if (!project) {
    return {
      project: undefined,
      month: undefined,
      csvFiles: [],
      report: null,
      forbidden: false,
    };
  }

  const month = await getProjectMonthForProject(project.id, monthId);
  if (!month) {
    return {
      project,
      month: undefined,
      csvFiles: [],
      report: null,
      forbidden: false,
    };
  }

  if (!canViewMonth(user, month)) {
    return { project, month, csvFiles: [], report: null, forbidden: true };
  }

  const files = await loadMonthCsvFiles(month.id);
  const csvFiles = Object.keys(files);

  const parsed = parseAllCSVs(files);
  const overrides = parseMetricOverrides(
    month.metric_overrides as string | Record<string, unknown> | null
  );
  if (overrides) {
    if (parsed.campaign) {
      parsed.campaign = {
        ...parsed.campaign,
        clicks: overrides.clicks,
        impressions: overrides.impressions,
        ctr: overrides.ctr,
        convRate: overrides.convRate,
        cost: overrides.cost,
        conversions: overrides.conversions,
      };
    } else {
      parsed.campaign = {
        campaign: project.campaign_name,
        dateRange: month.report_date_range || month.report_month,
        clicks: overrides.clicks,
        impressions: overrides.impressions,
        ctr: overrides.ctr,
        convRate: overrides.convRate,
        cost: overrides.cost,
        conversions: overrides.conversions,
      };
    }
  }

  const report = generateReport(
    project.name,
    project.campaign_name,
    month.report_month,
    month.report_date_range,
    parsed
  );

  return {
    project,
    month,
    csvFiles,
    report,
    forbidden: false,
    demographics: parsed.demographics,
    devices: parsed.devices,
  };
}

/**
 * 儀表板一次載完：CSV 只解析一次，關鍵字／星期圖／日趨勢並行讀取。
 */
export async function getProjectMonthDashboardBundle(
  slug: string,
  monthId: number,
  user: SessionUser
): Promise<
  | { ok: true; data: ProjectMonthDashboardBundle }
  | {
      ok: false;
      status: 401 | 403 | 404;
      error: string;
      project?: ProjectRecord;
      month?: ProjectMonthRecord;
    }
> {
  const project = await getProjectBySlug(slug);
  if (!project) {
    return { ok: false, status: 404, error: "專案不存在" };
  }

  const month = await getProjectMonthForProject(project.id, monthId);
  if (!month) {
    return { ok: false, status: 404, error: "月份不存在", project };
  }

  if (!canViewMonth(user, month)) {
    return {
      ok: false,
      status: 403,
      error: "此報告尚未開放",
      project,
      month,
    };
  }

  const [files, keywords, weekdaySaved] = await Promise.all([
    loadMonthCsvFiles(month.id),
    getKeywordRows(month.id),
    getWeekdayChartOverrides(month.id),
  ]);

  const csvFiles = Object.keys(files);
  const parsed = parseAllCSVs(files);
  const overrides = parseMetricOverrides(
    month.metric_overrides as string | Record<string, unknown> | null
  );

  if (overrides) {
    if (parsed.campaign) {
      parsed.campaign = {
        ...parsed.campaign,
        clicks: overrides.clicks,
        impressions: overrides.impressions,
        ctr: overrides.ctr,
        convRate: overrides.convRate,
        cost: overrides.cost,
        conversions: overrides.conversions,
      };
    } else {
      parsed.campaign = {
        campaign: project.campaign_name,
        dateRange: month.report_date_range || month.report_month,
        clicks: overrides.clicks,
        impressions: overrides.impressions,
        ctr: overrides.ctr,
        convRate: overrides.convRate,
        cost: overrides.cost,
        conversions: overrides.conversions,
      };
    }
  }

  const report = generateReport(
    project.name,
    project.campaign_name,
    month.report_month,
    month.report_date_range,
    parsed
  );

  const weekdayChart: WeekdayChartPoint[] =
    weekdaySaved ||
    report.page3.chartData.map((d) => ({
      day: d.day,
      impressions: d.impressions,
    }));

  const campaign = parsed.campaign;
  const totalClicks = campaign?.clicks ?? 0;
  const totalConversions = campaign?.conversions ?? 0;
  const totalImpressions = campaign?.impressions ?? 0;
  const ctr = campaign?.ctr ?? 0;
  const convRate = campaign?.convRate ?? 0;

  const dailyTrend = await resolveDailyTrend(
    month.id,
    totalClicks,
    totalConversions,
    month.report_month,
    month.report_date_range,
    {
      weekdayChart,
      totalImpressions,
      ctr,
      convRate,
    }
  );

  const daysInMonth = dailyTrend.points.length;

  return {
    ok: true,
    data: {
      project,
      month,
      report,
      keywords,
      demographics: parsed.demographics,
      devices: parsed.devices,
      weekdayChart,
      dailyTrend: { ...dailyTrend, daysInMonth },
      csvFiles,
    },
  };
}

export async function getProjectReport(slug: string): Promise<{
  project: ProjectRecord | undefined;
  csvFiles: string[];
  report: ReportData | null;
}> {
  const project = await getProjectBySlug(slug);
  if (!project) {
    return { project: undefined, csvFiles: [], report: null };
  }

  const supabase = getSupabaseAdmin();
  const { data: month, error } = await supabase
    .from("project_months")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!month) {
    return { project, csvFiles: [], report: null };
  }

  const files = await loadMonthCsvFiles(month.id);
  const csvFiles = Object.keys(files);
  const parsed = parseAllCSVs(files);
  const report = generateReport(
    project.name,
    project.campaign_name,
    month.report_month,
    month.report_date_range,
    parsed
  );

  return { project, csvFiles, report };
}
