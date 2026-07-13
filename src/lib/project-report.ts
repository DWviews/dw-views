import { getSupabaseAdmin } from "./supabase";
import { parseAllCSVs, type DemographicRow, type DeviceRow } from "./csv-parser";
import { generateReport, type ReportData } from "./report-engine";
import { getKeywordRows } from "./project-keywords";
import type { KeywordRow } from "./keyword-types";
import {
  canViewMonth,
  getMetricOverrides,
  getProjectMonthForProject,
  type ProjectMonthRecord,
} from "./project-months";
import { resolveProjectSlugCandidates } from "./project-slug";
import type { SessionUser } from "./auth";
import { loadMonthCsvFiles } from "./csv-files";

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

export async function getProjectBySlug(
  slug: string
): Promise<ProjectRecord | undefined> {
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
    return { project, month: undefined, csvFiles: [], report: null, forbidden: false };
  }

  if (!canViewMonth(user, month)) {
    return { project, month, csvFiles: [], report: null, forbidden: true };
  }

  const files = await loadMonthCsvFiles(month.id);
  const csvFiles = Object.keys(files);

  const parsed = parseAllCSVs(files);
  const overrides = await getMetricOverrides(month.id);
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
