import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import { canViewMonth, getProjectMonthForProject } from "@/lib/project-months";
import {
  getKeywordAdminItems,
  getKeywordRows,
  importKeywordFile,
  updateKeywordBoosts,
} from "@/lib/project-keywords";

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
    return NextResponse.json(
      { error: "此月份尚未開放 Views 權限" },
      { status: 403 }
    );
  }

  const isAdmin = session.role === "admin";

  if (isAdmin) {
    const items = await getKeywordAdminItems(month.id);
    return NextResponse.json({
      project: { id: project.id, name: project.name, slug: project.slug },
      month: {
        id: month.id,
        report_month: month.report_month,
      },
      isAdmin: true,
      items,
      keywords: items.map((item) => item.adjusted),
    });
  }

  return NextResponse.json({
    project: { id: project.id, name: project.name, slug: project.slug },
    month: {
      id: month.id,
      report_month: month.report_month,
    },
    isAdmin: false,
    keywords: await getKeywordRows(month.id),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "editor"].includes(session.role)) {
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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "請選擇關鍵字 CSV 或 Excel 檔案" },
      { status: 400 }
    );
  }

  const filename = file.name.toLowerCase();
  const allowed =
    filename.endsWith(".csv") ||
    filename.endsWith(".xlsx") ||
    filename.endsWith(".xls");
  if (!allowed) {
    return NextResponse.json(
      { error: "僅支援 .csv、.xlsx、.xls 格式" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await importKeywordFile(month.id, buffer, file.name);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "無有效關鍵字資料（Keyword 或 Impr. 為空白/0 的列已略過）" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    count: rows.length,
    keywords: rows,
    message: `已匯入 ${rows.length} 筆關鍵字（依 Impr. 由大至小排列）`,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可調整關鍵字數值" }, { status: 403 });
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
  const boosts = (body.boosts || []) as { keyword: string; boostPct: number }[];
  if (!Array.isArray(boosts) || boosts.length === 0) {
    return NextResponse.json({ error: "請提供調整資料" }, { status: 400 });
  }

  await updateKeywordBoosts(month.id, boosts);

  return NextResponse.json({
    keywords: await getKeywordRows(month.id),
    items: await getKeywordAdminItems(month.id),
    message: "已儲存關鍵字數值調整",
  });
}
