import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  getProjectMonthForProject,
  setMonthApproval,
} from "@/lib/project-months";

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

  const { approved } = await request.json();
  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "請提供 approved 參數" }, { status: 400 });
  }

  if (approved && month.status !== "ready") {
    return NextResponse.json(
      { error: "報告尚未就緒，無法開放 Views 權限" },
      { status: 400 }
    );
  }

  await setMonthApproval(id, approved, session.id);
  const updated = await getProjectMonthForProject(project.id, id);
  return NextResponse.json({ month: updated });
}
