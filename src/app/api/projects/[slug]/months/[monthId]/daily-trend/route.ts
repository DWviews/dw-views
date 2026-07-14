import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import { canViewMonth, getProjectMonthForProject } from "@/lib/project-months";
import {
  daysInReportMonth,
  generateAverageDailyTrend,
  generateDefaultDailyTrend,
  getDailyTrendRecord,
  getWeekdayChartOverrides,
  normalizePromo,
  persistDashboardCharts,
  resolveDailyTrend,
  setWeekdayChartOverrides,
  validateDailyTrend,
  validatePromo,
  isLongPromoRange,
  type DailyTrendPoint,
  type DailyTrendPromoConfig,
  type WeekdayChartPoint,
} from "@/lib/daily-trend";

function parseTotals(body: Record<string, unknown>) {
  return {
    totalClicks: Math.max(0, Math.round(Number(body.totalClicks) || 0)),
    totalConversions: Math.max(
      0,
      Math.round((Number(body.totalConversions) || 0) * 10) / 10
    ),
    totalImpressions: Math.max(0, Math.round(Number(body.totalImpressions) || 0)),
    ctr: Math.max(0, Number(body.ctr) || 0),
    convRate: Math.max(0, Number(body.convRate) || 0),
  };
}

function parsePromo(
  body: Record<string, unknown>,
  daysInMonth: number
): DailyTrendPromoConfig {
  return normalizePromo(
    {
      promoStartDay: Number(body.promoStartDay),
      promoEndDay: Number(body.promoEndDay),
    },
    daysInMonth
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
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
  if (!canViewMonth(session, month)) {
    return NextResponse.json({ error: "此月份尚未開放檢視權限" }, { status: 403 });
  }

  const searchParams = _request.nextUrl.searchParams;
  const totalClicks = Number(searchParams.get("clicks") || 0);
  const totalConversions = Number(searchParams.get("conversions") || 0);
  const totalImpressions = Number(searchParams.get("impressions") || 0);
  const ctr = Number(searchParams.get("ctr") || 0);
  const convRate = Number(searchParams.get("convRate") || 0);
  const weekdayRaw = searchParams.get("weekday");

  let weekdaySeed: WeekdayChartPoint[] | undefined;
  if (weekdayRaw) {
    try {
      weekdaySeed = JSON.parse(weekdayRaw) as WeekdayChartPoint[];
    } catch {
      weekdaySeed = undefined;
    }
  }

  const daysInMonth = daysInReportMonth(
    month.report_month,
    month.report_date_range
  );

  const savedRecord = await getDailyTrendRecord(month.id);
  const hadSaved = Boolean(savedRecord);

  const record = await resolveDailyTrend(
    month.id,
    totalClicks,
    totalConversions,
    month.report_month,
    month.report_date_range,
    {
      weekdayChart: weekdaySeed,
      persist: true,
      totalImpressions,
      ctr,
      convRate,
    }
  );

  if (weekdaySeed?.length && !(await getWeekdayChartOverrides(month.id))) {
    await setWeekdayChartOverrides(month.id, weekdaySeed);
  }

  return NextResponse.json({
    points: record.points,
    promo: record.promo,
    daysInMonth,
    weekdayChart: await getWeekdayChartOverrides(month.id),
    isAdmin: session.role === "admin",
    editable: session.role === "admin",
    source: hadSaved ? "saved" : "generated",
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

  const body = (await request.json()) as {
    points?: DailyTrendPoint[];
    reset?: boolean;
    resetMode?: "promo" | "average";
    totalClicks?: number;
    totalConversions?: number;
    totalImpressions?: number;
    ctr?: number;
    convRate?: number;
    promoStartDay?: number;
    promoEndDay?: number;
    weekdayChart?: WeekdayChartPoint[];
  };

  const daysInMonth = daysInReportMonth(
    month.report_month,
    month.report_date_range
  );

  if (body.reset) {
    const totals = parseTotals(body);
    const promo = parsePromo(body, daysInMonth);
    const promoError = validatePromo(promo, daysInMonth);
    if (promoError) {
      return NextResponse.json({ error: promoError }, { status: 400 });
    }

    const weekdayChart =
      body.weekdayChart ?? (await getWeekdayChartOverrides(month.id)) ?? undefined;

    const trendContext = {
      weekdayChart,
      reportMonth: month.report_month,
      totalImpressions: totals.totalImpressions,
      ctr: totals.ctr,
      convRate: totals.convRate,
    };

    const isAverage =
      body.resetMode === "average" || isLongPromoRange(promo);
    const points = isAverage
      ? generateAverageDailyTrend(
          totals.totalClicks,
          totals.totalConversions,
          daysInMonth,
          trendContext
        )
      : generateDefaultDailyTrend(
          totals.totalClicks,
          totals.totalConversions,
          daysInMonth,
          promo,
          trendContext
        );
    const record = { promo, points };
    await persistDashboardCharts(month.id, record, body.weekdayChart);

    return NextResponse.json({
      points,
      promo,
      daysInMonth,
      weekdayChart: await getWeekdayChartOverrides(month.id),
      message: isAverage
        ? body.resetMode === "average"
          ? "已重設為平均趨勢（輕微起伏）並儲存"
          : `優惠期超過 24 日，已平均分佈至 1–${daysInMonth} 日並儲存`
        : `已依優惠期（${promo.promoStartDay}–${promo.promoEndDay} 日）自動生成並儲存趨勢數值`,
      source: "saved",
    });
  }

  const points = body.points || [];
  const validationError = validateDailyTrend(points, daysInMonth);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const promo = parsePromo(body, daysInMonth);
  const promoError = validatePromo(promo, daysInMonth);
  if (promoError) {
    return NextResponse.json({ error: promoError }, { status: 400 });
  }

  await persistDashboardCharts(
    month.id,
    { promo, points },
    body.weekdayChart
  );

  return NextResponse.json({
    points,
    promo,
    daysInMonth,
    weekdayChart: await getWeekdayChartOverrides(month.id),
    message: "已儲存圖表數值",
    source: "saved",
  });
}
