import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  createProjectMonth,
  getProjectMonthForProject,
  getLatestReadyMonth,
  refreshMonthStatus,
  setMetricOverrides,
  monthExistsForProject,
  listReportMonthLabels,
} from "@/lib/project-months";
import {
  generateNextMonthData,
  latestReportMonthLabel,
  metricsFromCampaign,
  nextReportMonthLabel,
  sameReportMonth,
  validateGeneratedMetrics,
} from "@/lib/month-generator";
import { getCsvFileContent, insertMonthCsvFiles } from "@/lib/csv-files";

const CSV_TYPES = ["01", "02", "03", "04", "05", "06"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可使用自動生成功能" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceMonthId = body.sourceMonthId as number | undefined;

  const sourceMonth = sourceMonthId
    ? await getProjectMonthForProject(project.id, sourceMonthId)
    : await getLatestReadyMonth(project.id);

  if (!sourceMonth || sourceMonth.csv_count !== 6) {
    return NextResponse.json(
      { error: "請先選擇一個已完成 6 份 CSV 的來源月份" },
      { status: 400 }
    );
  }

  const sourceFiles: Record<string, string> = {};
  for (const type of CSV_TYPES) {
    const content = await getCsvFileContent(sourceMonth.id, type);
    if (!content) {
      return NextResponse.json(
        { error: `來源月份缺少 ${type}.csv` },
        { status: 400 }
      );
    }
    sourceFiles[type] = content;
  }

  const latestLabel = latestReportMonthLabel(
    await listReportMonthLabels(project.id)
  );
  if (latestLabel && !sameReportMonth(sourceMonth.report_month, latestLabel)) {
    return NextResponse.json(
      {
        error: `新報告必須接在最新月份之後。請選擇 ${latestLabel} 再生成下一個月。`,
      },
      { status: 400 }
    );
  }

  const targetReportMonth = nextReportMonthLabel(sourceMonth.report_month);
  const generated = generateNextMonthData(
    sourceFiles,
    project.campaign_name,
    sourceMonth.report_month,
    null,
    targetReportMonth
  );

  const duplicate = await monthExistsForProject(
    project.id,
    generated.reportMonth
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `${generated.reportMonth} 已存在，無法重複生成` },
      { status: 409 }
    );
  }

  const warnings = validateGeneratedMetrics(generated.parsed);
  const month = await createProjectMonth(
    project.id,
    generated.reportMonth,
    generated.reportDateRange
  );

  await insertMonthCsvFiles(project.id, month.id, generated.files);

  if (generated.parsed.campaign) {
    await setMetricOverrides(
      month.id,
      metricsFromCampaign(generated.parsed.campaign)
    );
  }

  await refreshMonthStatus(month.id);
  const created = await getProjectMonthForProject(project.id, month.id);

  return NextResponse.json({
    month: created,
    sourceMonthId: sourceMonth.id,
    warnings,
    message: `已自動生成 ${generated.reportMonth} 報告（數據變動約 ±5%）`,
  });
}
