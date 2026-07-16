import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  assignLogoToProject,
  uploadClientLogo,
} from "@/lib/client-logos";
import {
  CLIENT_ACCOUNT_FIELDS,
  enrichClientAccount,
} from "@/lib/client-account";

const ACCOUNT_SELECT = [...CLIENT_ACCOUNT_FIELDS, "logo_id"].join(", ");

async function loadAccountAfterUpdate(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(ACCOUNT_SELECT)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return enrichClientAccount(data as unknown as Record<string, unknown>);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可設定品牌標誌" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { logoId?: number };
      const logoId = Number(body.logoId);
      if (!Number.isFinite(logoId)) {
        return NextResponse.json({ error: "請選擇有效標誌" }, { status: 400 });
      }

      await assignLogoToProject(project.id, logoId);
      const account = await loadAccountAfterUpdate(slug);
      return NextResponse.json({
        account,
        message: "已套用既有品牌標誌",
      });
    }

    const formData = await request.formData();
    const file = formData.get("logo");
    const label = String(formData.get("label") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "僅支援 PNG、JPEG、WebP、SVG 格式" },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: "圖片大小不可超過 512 KB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logo = await uploadClientLogo(
      buffer,
      file.type,
      label || project.name
    );
    await assignLogoToProject(project.id, logo.id);
    const account = await loadAccountAfterUpdate(slug);

    return NextResponse.json({
      account,
      message: "品牌標誌已上傳並套用",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "設定失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可移除品牌標誌" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  await assignLogoToProject(project.id, null);
  const account = await loadAccountAfterUpdate(slug);

  return NextResponse.json({
    account,
    message: "品牌標誌已移除",
  });
}
