import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectMonthDashboardBundle } from "@/lib/project-report";

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

    const result = await getProjectMonthDashboardBundle(slug, id, session);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const { data } = result;

    return NextResponse.json({
      project: data.project,
      month: data.month,
      report: data.report,
      keywords: data.keywords,
      demographics: data.demographics,
      devices: data.devices,
      weekdayChart: data.weekdayChart,
      dailyTrend: data.dailyTrend,
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
