import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  createProjectMonth,
  listProjectMonths,
  listReportMonthLabels,
  monthExistsForProject,
} from "@/lib/project-months";
import {
  dateRangeForReportMonth,
  upcomingReportMonthLabel,
} from "@/lib/month-generator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const months = await listProjectMonths(project.id, session);
  return NextResponse.json({ months });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  await request.json().catch(() => ({}));

  const reportMonth = upcomingReportMonthLabel(
    await listReportMonthLabels(project.id)
  );
  const reportDateRange = dateRangeForReportMonth(reportMonth);

  const exists = await monthExistsForProject(project.id, reportMonth);
  if (exists) {
    return NextResponse.json(
      { error: `${reportMonth} 已存在，無法重複建立` },
      { status: 409 }
    );
  }

  const month = await createProjectMonth(
    project.id,
    reportMonth,
    reportDateRange
  );
  return NextResponse.json({ month });
}
