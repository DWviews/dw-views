import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import { canViewMonth, getProjectMonthForProject } from "@/lib/project-months";
import {
  createSemScreenshot,
  deleteSemScreenshot,
  listSemScreenshots,
  updateSemScreenshotTitle,
} from "@/lib/project-sem-screenshots";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_PER_MONTH = 20;

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

  const screenshots = await listSemScreenshots(month.id);

  return NextResponse.json({
    project: { id: project.id, name: project.name, slug: project.slug },
    month: {
      id: month.id,
      report_month: month.report_month,
      report_date_range: month.report_date_range,
    },
    canEdit: session.role === "admin" || session.role === "editor",
    screenshots: screenshots.map((s) => ({
      id: s.id,
      title: s.title,
      mimeType: s.mime_type,
      imageUrl: s.image_data.startsWith("data:")
        ? s.image_data
        : `data:${s.mime_type};base64,${s.image_data}`,
      sortOrder: s.sort_order,
      uploadedAt: s.uploaded_at,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "無權限上傳截圖" }, { status: 403 });
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

  const existing = await listSemScreenshots(month.id);
  if (existing.length >= MAX_PER_MONTH) {
    return NextResponse.json(
      { error: `每個月份最多 ${MAX_PER_MONTH} 張 SEM 截圖` },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const title =
    typeof formData.get("title") === "string"
      ? (formData.get("title") as string)
      : "";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "請選擇截圖檔案" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "僅支援 PNG、JPEG、WebP 格式" },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "單張截圖不可超過 4 MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const imageData = `data:${file.type};base64,${base64}`;

  const screenshot = await createSemScreenshot({
    monthId: month.id,
    title: title || file.name.replace(/\.[^.]+$/, "") || "SEM Search 截圖",
    imageData,
    mimeType: file.type,
    uploadedBy: session.id,
  });

  return NextResponse.json({
    message: "SEM Search 截圖已上傳",
    screenshot: {
      id: screenshot.id,
      title: screenshot.title,
      mimeType: screenshot.mime_type,
      imageUrl: screenshot.image_data,
      sortOrder: screenshot.sort_order,
      uploadedAt: screenshot.uploaded_at,
    },
  });
}

export async function PATCH(
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

  const body = await request.json();
  const screenshotId = Number(body.id);
  const title = typeof body.title === "string" ? body.title : "";

  if (!screenshotId) {
    return NextResponse.json({ error: "缺少截圖 ID" }, { status: 400 });
  }

  const updated = await updateSemScreenshotTitle(month.id, screenshotId, title);
  if (!updated) {
    return NextResponse.json({ error: "截圖不存在" }, { status: 404 });
  }

  return NextResponse.json({
    message: "標題已更新",
    screenshot: {
      id: updated.id,
      title: updated.title,
      mimeType: updated.mime_type,
      imageUrl: updated.image_data,
      sortOrder: updated.sort_order,
      uploadedAt: updated.uploaded_at,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; monthId: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "無權限刪除截圖" }, { status: 403 });
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

  const { searchParams } = new URL(request.url);
  const screenshotId = Number(searchParams.get("id"));
  if (!screenshotId) {
    return NextResponse.json({ error: "缺少截圖 ID" }, { status: 400 });
  }

  const ok = await deleteSemScreenshot(month.id, screenshotId);
  if (!ok) {
    return NextResponse.json({ error: "截圖不存在" }, { status: 404 });
  }

  return NextResponse.json({ message: "截圖已刪除" });
}
