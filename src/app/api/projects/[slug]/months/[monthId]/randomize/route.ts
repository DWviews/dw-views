import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  getMetricOverrides,
  getProjectMonthForProject,
  refreshMonthStatus,
  setMetricOverrides,
} from "@/lib/project-months";
import {
  generateRandomizedMonthData,
  type MetricBiasSettings,
  metricsFromCampaign,
  metricsFromCost,
  normalizeMetrics,
  RANDOMIZE_SECTIONS,
  validateGeneratedMetrics,
  validateMonthMetrics,
  type MonthMetricsInput,
  type RandomizeSection,
} from "@/lib/month-generator";
import { parseAllCSVs } from "@/lib/csv-parser";
import {
  daysInReportMonth,
  defaultPromoRange,
  generateDefaultDailyTrend,
  persistDashboardCharts,
  type WeekdayChartPoint,
} from "@/lib/daily-trend";
import { loadMonthCsvFiles, upsertMonthCsvFiles } from "@/lib/csv-files";

const CSV_TYPES = ["01", "02", "03", "04", "05", "06"] as const;

async function resolveMetrics(
  monthId: number,
  files: Record<string, string>
): Promise<MonthMetricsInput | null> {
  const overrides = await getMetricOverrides(monthId);
  if (overrides) return overrides;

  const parsed = parseAllCSVs(files);
  return parsed.campaign ? metricsFromCampaign(parsed.campaign) : null;
}

function parseSections(value: unknown): RandomizeSection[] {
  if (!Array.isArray(value)) return RANDOMIZE_SECTIONS;
  const allowed = new Set<string>(RANDOMIZE_SECTIONS);
  const sections = value.filter(
    (section): section is RandomizeSection =>
      typeof section === "string" && allowed.has(section)
  );
  return sections.length > 0 ? sections : RANDOMIZE_SECTIONS;
}

function parseBias(value: unknown): MetricBiasSettings {
  const input = typeof value === "object" && value ? value : {};
  const raw = input as Record<string, unknown>;
  const normalize = (key: string) =>
    raw[key] === "higher" || raw[key] === "lower" || raw[key] === "auto"
      ? (raw[key] as "higher" | "lower" | "auto")
      : "auto";

  return {
    clicks: normalize("clicks"),
    impressions: normalize("impressions"),
    ctr: normalize("ctr"),
    convRate: normalize("convRate"),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可使用全報告隨機生成" }, { status: 403 });
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

  const body = await request.json().catch(() => ({}));
  const similarityPct = Math.min(
    100,
    Math.max(0, Math.round(Number(body.similarityPct) || 85))
  );
  const bias = parseBias(body.bias);
  const sections = parseSections(body.sections);
  const sourceMonthId = Number(body.sourceMonthId) || month.id;
  const sourceMonth = await getProjectMonthForProject(project.id, sourceMonthId);
  if (!sourceMonth) {
    return NextResponse.json({ error: "參考月份不存在" }, { status: 404 });
  }

  const sourceFiles = await loadMonthCsvFiles(sourceMonth.id);
  const missing = CSV_TYPES.filter((type) => !sourceFiles[type]);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `參考月份 ${sourceMonth.report_month} 缺少 ${missing.join(", ")}.csv，請先補齊 6 份 CSV`,
      },
      { status: 400 }
    );
  }

  const baseMetrics = await resolveMetrics(sourceMonth.id, sourceFiles);
  if (!baseMetrics) {
    return NextResponse.json(
      { error: "參考月份尚無可用基礎數據，請先上傳 CSV" },
      { status: 400 }
    );
  }

  const cost = Number(body.cost);
  if (!Number.isFinite(cost) || cost < 0) {
    return NextResponse.json(
      { error: "請輸入有效的費用 (HK$)" },
      { status: 400 }
    );
  }

  const metrics = normalizeMetrics(metricsFromCost(baseMetrics, cost, similarityPct, bias));
  const validationError = validateMonthMetrics(metrics);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const generated = generateRandomizedMonthData(
      sourceFiles,
      project.campaign_name,
      month.report_month,
      month.report_date_range,
      metrics,
      { similarityPct, sections, bias }
    );

    await upsertMonthCsvFiles(project.id, month.id, generated.files);
    await setMetricOverrides(month.id, metrics);

    const weekdayChart: WeekdayChartPoint[] = generated.parsed.days.map((day) => ({
      day: day.day,
      impressions: day.impressions,
    }));
    const daysInMonth = daysInReportMonth(
      month.report_month,
      month.report_date_range
    );
    const promo = defaultPromoRange(daysInMonth);
    const dailyTrend = generateDefaultDailyTrend(
      metrics.clicks,
      metrics.conversions,
      daysInMonth,
      promo,
      {
        weekdayChart,
        reportMonth: month.report_month,
        totalImpressions: metrics.impressions,
        ctr: metrics.ctr,
        convRate: metrics.convRate,
      }
    );

    await persistDashboardCharts(
      month.id,
      { promo, points: dailyTrend },
      weekdayChart
    );
    await refreshMonthStatus(month.id);

    return NextResponse.json({
      metrics,
      sections,
      bias,
      similarityPct,
      sourceMonthId: sourceMonth.id,
      sourceMonthLabel: sourceMonth.report_month,
      targetMonthId: month.id,
      targetMonthLabel: month.report_month,
      warnings: validateGeneratedMetrics(generated.parsed),
      message: `已將 ${sourceMonth.report_month}（${similarityPct}% 相似度）依費用 HK$${metrics.cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 生成至 ${month.report_month}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "全報告隨機生成失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
