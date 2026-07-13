import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug, getProjectMonthReport } from "@/lib/project-report";
import {
  getProjectMonthForProject,
  updateProjectMonthMeta,
} from "@/lib/project-months";

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
      { error: "此月份尚未開放 Views 權限" },
      { status: 403 }
    );
  }
  if (!result.report) {
    return NextResponse.json({ error: "報告資料不完整" }, { status: 404 });
  }

  return NextResponse.json({
    project: result.project,
    month: result.month,
    csvFiles: result.csvFiles,
    report: result.report,
  });
}

export async function PUT(
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

  const body = await request.json();
  await updateProjectMonthMeta(id, {
    reportMonth: body.reportMonth,
    reportDateRange: body.reportDateRange,
    campaignName: body.campaignName,
  });

  const updated = await getProjectMonthForProject(project.id, id);
  return NextResponse.json({ month: updated });
}
