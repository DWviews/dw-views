import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseAllCSVs } from "@/lib/csv-parser";
import {
  applyMetricsUpdate,
  metricsFromCampaign,
  validateMonthMetrics,
  type MonthMetricsInput,
} from "@/lib/month-generator";
import {
  getMetricOverrides,
  getProjectMonthForProject,
  refreshMonthStatus,
  setMetricOverrides,
} from "@/lib/project-months";
import { getProjectBySlug } from "@/lib/project-report";
import { loadMonthCsvFiles, upsertMonthCsvFiles } from "@/lib/csv-files";

async function resolveMetrics(
  monthId: number,
  files: Record<string, string>
): Promise<MonthMetricsInput | null> {
  const overrides = await getMetricOverrides(monthId);
  if (overrides) return overrides;

  const parsed = parseAllCSVs(files);
  if (parsed.campaign) {
    return metricsFromCampaign(parsed.campaign);
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { slug, monthId } = await params;
  const id = Number(monthId);
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const month = await getProjectMonthForProject(project.id, id);
  if (!month) {
    return NextResponse.json({ error: "月份不存在" }, { status: 404 });
  }

  const files = await loadMonthCsvFiles(month.id);
  const metrics = await resolveMetrics(month.id, files);
  if (!metrics) {
    return NextResponse.json(
      {
        error: "此月份尚無可編輯的專案數值",
        editable: false,
      },
      { status: 404 }
    );
  }

  const overrides = await getMetricOverrides(month.id);

  return NextResponse.json({
    metrics,
    editable: true,
    source: overrides ? "overrides" : files["01"] ? "csv" : "generated",
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { slug, monthId } = await params;
  const id = Number(monthId);
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const month = await getProjectMonthForProject(project.id, id);
  if (!month) {
    return NextResponse.json({ error: "月份不存在" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<MonthMetricsInput>;
  const metrics: MonthMetricsInput = {
    clicks: Number(body.clicks),
    impressions: Number(body.impressions),
    ctr: Number(body.ctr),
    convRate: Number(body.convRate),
    cost: Number(body.cost),
    conversions: Number(body.conversions),
  };

  const validationError = validateMonthMetrics(metrics);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await setMetricOverrides(month.id, metrics);

  const sourceFiles = await loadMonthCsvFiles(month.id);
  const dateRange = month.report_date_range || month.report_month;

  try {
    const updatedFiles = applyMetricsUpdate(
      sourceFiles,
      project.campaign_name,
      dateRange,
      metrics
    );
    await upsertMonthCsvFiles(project.id, month.id, updatedFiles);
    await refreshMonthStatus(month.id);

    return NextResponse.json({
      metrics,
      message: "已更新月度專案數值",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新月度專案數值失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
