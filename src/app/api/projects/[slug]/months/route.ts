import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  createProjectMonth,
  listProjectMonths,
  monthExistsForProject,
} from "@/lib/project-months";

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

  const { reportMonth, reportDateRange } = await request.json();
  if (!reportMonth) {
    return NextResponse.json({ error: "請填寫報告月份" }, { status: 400 });
  }

  const exists = await monthExistsForProject(project.id, reportMonth);
  if (exists) {
    return NextResponse.json({ error: "此月份已存在" }, { status: 409 });
  }

  const month = await createProjectMonth(
    project.id,
    reportMonth,
    reportDateRange
  );
  return NextResponse.json({ month });
}
