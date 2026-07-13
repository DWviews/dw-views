import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProjectMonthReport,
  getProjectMonthDashboardExtras,
} from "@/lib/project-report";
import { getWeekdayChartOverrides } from "@/lib/daily-trend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { slug, monthId } = await params;
    const id = Number(monthId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "月份無效" }, { status: 400 });
    }

    const result = await getProjectMonthReport(slug, id, session);
    if (!result.project) {
      return NextResponse.json({ error: "專案不存在" }, { status: 404 });
    }
    if (!result.month) {
      return NextResponse.json({ error: "月份不存在" }, { status: 404 });
    }
    if (result.forbidden) {
      return NextResponse.json(
        { error: "此報告尚未開放" },
        { status: 403 }
      );
    }
    if (!result.report) {
      return NextResponse.json({ error: "報告資料不完整" }, { status: 404 });
    }

    const extras = await getProjectMonthDashboardExtras(result.month.id);

    const weekdaySaved = await getWeekdayChartOverrides(result.month.id);
    const weekdayChart =
      weekdaySaved ||
      result.report.page3.chartData.map((d) => ({
        day: d.day,
        impressions: d.impressions,
      }));

    return NextResponse.json({
      project: result.project,
      month: result.month,
      report: result.report,
      keywords: extras.keywords,
      demographics: extras.demographics,
      devices: extras.devices,
      weekdayChart,
      isAdmin: session.role === "admin",
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "載入儀表板資料失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
