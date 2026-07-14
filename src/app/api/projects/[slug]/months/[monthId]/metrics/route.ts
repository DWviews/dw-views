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
  alignTrendToTotals,
  daysInReportMonth,
  defaultPromoRange,
  generateDefaultDailyTrend,
  getDailyTrendRecord,
  getWeekdayChartOverrides,
  normalizePromo,
  persistDashboardCharts,
} from "@/lib/daily-trend";
import {
  getMetricOverrides,
  getProjectMonthForProject,
  listProjectMonths,
  refreshMonthStatus,
  setMetricOverrides,
  type ProjectMonthRecord,
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function withDerivedRates(metrics: MonthMetricsInput): MonthMetricsInput {
  const clicks = Math.max(0, Math.round(metrics.clicks));
  const impressions = Math.max(0, Math.round(metrics.impressions));
  const conversions = Math.max(0, round1(metrics.conversions));
  return {
    clicks,
    impressions,
    conversions,
    cost: Math.max(0, Math.round(metrics.cost * 100) / 100),
    ctr:
      impressions > 0
        ? Math.round((clicks / impressions) * 10000) / 100
        : metrics.ctr,
    convRate:
      clicks > 0
        ? Math.round((conversions / clicks) * 10000) / 100
        : metrics.convRate,
  };
}

/** 將相反增減量以隨機權重分攤到其他月份（專案點擊／轉換總量大致不變） */
function allocateOppositeDeltaToSiblings(
  siblings: { month: ProjectMonthRecord; metrics: MonthMetricsInput }[],
  oppositeClicks: number,
  oppositeConversions: number
): { month: ProjectMonthRecord; metrics: MonthMetricsInput }[] {
  if (
    siblings.length === 0 ||
    (oppositeClicks === 0 && oppositeConversions === 0)
  ) {
    return [];
  }

  const weights = siblings.map(
    (row) =>
      Math.max(0.1, row.metrics.clicks) * (0.35 + Math.random() * 1.3) +
      Math.random()
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  let clicksLeft = oppositeClicks;
  let convLeft = oppositeConversions;

  return siblings.map((row, index) => {
    const isLast = index === siblings.length - 1;
    const ratio = weights[index] / weightSum;
    const clickShare = isLast
      ? clicksLeft
      : Math.round(oppositeClicks * ratio);
    const convShare = isLast
      ? convLeft
      : round1(oppositeConversions * ratio);

    if (!isLast) {
      clicksLeft -= clickShare;
      convLeft = round1(convLeft - convShare);
    }

    return {
      month: row.month,
      metrics: withDerivedRates({
        ...row.metrics,
        clicks: Math.max(0, Math.round(row.metrics.clicks + clickShare)),
        conversions: Math.max(
          0,
          round1(row.metrics.conversions + convShare)
        ),
      }),
    };
  });
}

async function syncMonthTrendToMetrics(
  month: ProjectMonthRecord,
  metrics: MonthMetricsInput
): Promise<void> {
  const daysInMonth = daysInReportMonth(
    month.report_month,
    month.report_date_range
  );
  const saved = await getDailyTrendRecord(month.id);
  const weekdayChart = (await getWeekdayChartOverrides(month.id)) ?? undefined;
  const promo = normalizePromo(
    saved?.promo ?? defaultPromoRange(daysInMonth),
    daysInMonth
  );

  const points =
    saved && saved.points.length === daysInMonth
      ? alignTrendToTotals(saved.points, metrics.clicks, metrics.conversions)
      : generateDefaultDailyTrend(
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

  await persistDashboardCharts(month.id, { promo, points }, weekdayChart);
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
    // 新建專案／尚未上傳 CSV 時屬正常狀態，回 200 避免前端 console 出現 404
    return NextResponse.json({
      metrics: null,
      editable: false,
      message: "此月份尚無可編輯的專案數值",
    });
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

  const body = (await request.json()) as Partial<MonthMetricsInput> & {
    redistributeSiblings?: boolean;
  };
  const metrics = withDerivedRates({
    clicks: Number(body.clicks),
    impressions: Number(body.impressions),
    ctr: Number(body.ctr),
    convRate: Number(body.convRate),
    cost: Number(body.cost),
    conversions: Number(body.conversions),
  });

  const validationError = validateMonthMetrics(metrics);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sourceFiles = await loadMonthCsvFiles(month.id);
  const previous = await resolveMetrics(month.id, sourceFiles);
  const dateRange = month.report_date_range || month.report_month;
  const shouldRedistribute = body.redistributeSiblings !== false;

  try {
    const updatedFiles = applyMetricsUpdate(
      sourceFiles,
      project.campaign_name,
      dateRange,
      metrics
    );
    await upsertMonthCsvFiles(project.id, month.id, updatedFiles);
    await setMetricOverrides(month.id, metrics);
    await syncMonthTrendToMetrics(month, metrics);

    const siblingUpdates: {
      monthId: number;
      reportMonth: string;
      metrics: MonthMetricsInput;
    }[] = [];

    if (shouldRedistribute && previous) {
      const oppositeClicks = previous.clicks - metrics.clicks;
      const oppositeConversions = round1(
        previous.conversions - metrics.conversions
      );

      if (oppositeClicks !== 0 || oppositeConversions !== 0) {
        const allMonths = await listProjectMonths(project.id, session);
        const siblings: {
          month: ProjectMonthRecord;
          metrics: MonthMetricsInput;
        }[] = [];

        for (const candidate of allMonths) {
          if (candidate.id === month.id) continue;
          const files = await loadMonthCsvFiles(candidate.id);
          const siblingMetrics = await resolveMetrics(candidate.id, files);
          if (!siblingMetrics) continue;
          siblings.push({ month: candidate, metrics: siblingMetrics });
        }

        const allocated = allocateOppositeDeltaToSiblings(
          siblings,
          oppositeClicks,
          oppositeConversions
        );

        for (const row of allocated) {
          const siblingFiles = await loadMonthCsvFiles(row.month.id);
          if (!siblingFiles["01"] && Object.keys(siblingFiles).length === 0) {
            continue;
          }
          const siblingDateRange =
            row.month.report_date_range || row.month.report_month;
          try {
            const nextFiles = applyMetricsUpdate(
              siblingFiles,
              project.campaign_name,
              siblingDateRange,
              row.metrics
            );
            await upsertMonthCsvFiles(project.id, row.month.id, nextFiles);
          } catch {
            // 缺少完整 CSV 時仍寫入 overrides + 趨勢
          }
          await setMetricOverrides(row.month.id, row.metrics);
          await syncMonthTrendToMetrics(row.month, row.metrics);
          await refreshMonthStatus(row.month.id);
          siblingUpdates.push({
            monthId: row.month.id,
            reportMonth: row.month.report_month,
            metrics: row.metrics,
          });
        }
      }
    }

    await refreshMonthStatus(month.id);

    return NextResponse.json({
      metrics,
      siblingUpdates,
      message:
        siblingUpdates.length > 0
          ? `已更新月度專案數值，並將增減量隨機分攤至 ${siblingUpdates.length} 個其他月份`
          : "已更新月度專案數值",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新月度專案數值失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
