import { getSupabaseAdmin } from "./supabase";
import type { SessionUser } from "./auth";
import type { MonthMetricsInput } from "./month-generator";
import { getCsvFileCount } from "./csv-files";

export interface ProjectMonthRecord {
  id: number;
  project_id: number;
  report_month: string;
  report_date_range: string | null;
  status: string;
  views_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  metric_overrides: unknown;
  created_at: string;
  updated_at: string;
  csv_count?: number;
}

function mapMonthRow(
  row: Record<string, unknown>,
  csvCount?: number
): ProjectMonthRecord {
  return {
    id: row.id as number,
    project_id: row.project_id as number,
    report_month: row.report_month as string,
    report_date_range: row.report_date_range as string | null,
    status: row.status as string,
    views_approved: row.views_approved as boolean,
    approved_by: row.approved_by as number | null,
    approved_at: row.approved_at as string | null,
    metric_overrides: row.metric_overrides,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    csv_count: csvCount,
  };
}

export function parseMetricOverrides(
  raw: string | null | undefined | Record<string, unknown>
): MonthMetricsInput | null {
  if (!raw) return null;
  try {
    const parsed = (
      typeof raw === "string" ? JSON.parse(raw) : raw
    ) as Partial<MonthMetricsInput>;
    if (
      parsed.clicks === undefined ||
      parsed.impressions === undefined ||
      parsed.ctr === undefined ||
      parsed.convRate === undefined ||
      parsed.cost === undefined ||
      parsed.conversions === undefined
    ) {
      return null;
    }
    return parsed as MonthMetricsInput;
  } catch {
    return null;
  }
}

export async function getMetricOverrides(
  monthId: number
): Promise<MonthMetricsInput | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("metric_overrides")
    .eq("id", monthId)
    .maybeSingle();

  if (error) throw error;
  return parseMetricOverrides(
    data?.metric_overrides as string | Record<string, unknown> | null
  );
}

export async function setMetricOverrides(
  monthId: number,
  metrics: MonthMetricsInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_months")
    .update({ metric_overrides: metrics })
    .eq("id", monthId);

  if (error) throw error;
}

export function canViewMonth(
  user: SessionUser,
  month: Pick<ProjectMonthRecord, "views_approved" | "status">
): boolean {
  if (user.role === "admin" || user.role === "editor") {
    return true;
  }
  return month.views_approved === true && month.status === "ready";
}

export async function listProjectMonths(
  projectId: number,
  user: SessionUser
): Promise<ProjectMonthRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const monthIds = rows.map((row) => row.id as number);
  const { data: csvRows, error: csvError } = await supabase
    .from("project_csv_files")
    .select("project_month_id")
    .in("project_month_id", monthIds);

  if (csvError) throw csvError;

  const countMap = new Map<number, number>();
  for (const csv of csvRows ?? []) {
    const mid = csv.project_month_id as number;
    countMap.set(mid, (countMap.get(mid) || 0) + 1);
  }

  return rows
    .map((row) => mapMonthRow(row, countMap.get(row.id as number) ?? 0))
    .filter((month) => canViewMonth(user, month));
}

export async function getProjectMonthById(
  monthId: number
): Promise<ProjectMonthRecord | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("*")
    .eq("id", monthId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;

  const csvCount = await getCsvFileCount(data.id);
  return mapMonthRow(data, csvCount);
}

export async function getProjectMonthForProject(
  projectId: number,
  monthId: number
): Promise<ProjectMonthRecord | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("*")
    .eq("id", monthId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;

  const csvCount = await getCsvFileCount(data.id);
  return mapMonthRow(data, csvCount);
}

export async function createProjectMonth(
  projectId: number,
  reportMonth: string,
  reportDateRange?: string
): Promise<ProjectMonthRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .insert({
      project_id: projectId,
      report_month: reportMonth,
      report_date_range: reportDateRange ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapMonthRow(data, 0);
}

export async function updateProjectMonthMeta(
  monthId: number,
  data: {
    reportMonth?: string;
    reportDateRange?: string;
    campaignName?: string;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (data.reportMonth !== undefined || data.reportDateRange !== undefined) {
    const updates: Record<string, string | null> = {};
    if (data.reportMonth !== undefined) updates.report_month = data.reportMonth;
    if (data.reportDateRange !== undefined) {
      updates.report_date_range = data.reportDateRange;
    }

    const { error } = await supabase
      .from("project_months")
      .update(updates)
      .eq("id", monthId);
    if (error) throw error;
  }

  if (data.campaignName !== undefined) {
    const month = await getProjectMonthById(monthId);
    if (month) {
      const { error: projectError } = await supabase
        .from("projects")
        .update({ campaign_name: data.campaignName })
        .eq("id", month.project_id);
      if (projectError) throw projectError;
    }
  }
}

export async function setMonthApproval(
  monthId: number,
  approved: boolean,
  adminId: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_months")
    .update({
      views_approved: approved,
      approved_by: approved ? adminId : null,
      approved_at: approved ? new Date().toISOString() : null,
    })
    .eq("id", monthId);

  if (error) throw error;
}

export async function refreshMonthStatus(monthId: number): Promise<void> {
  const csvCount = await getCsvFileCount(monthId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("project_months")
    .update({ status: csvCount === 6 ? "ready" : "draft" })
    .eq("id", monthId);

  if (error) throw error;
}

export async function getLatestReadyMonth(
  projectId: number
): Promise<ProjectMonthRecord | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;

  const csvCount = await getCsvFileCount(data.id);
  return mapMonthRow(data, csvCount);
}

export async function monthExistsForProject(
  projectId: number,
  reportMonth: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_months")
    .select("id")
    .eq("project_id", projectId)
    .eq("report_month", reportMonth)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
