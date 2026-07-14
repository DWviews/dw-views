import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import { rowToClientAccount } from "@/lib/client-account";

const MAX_LOGO_BYTES = 512 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可上傳品牌標誌" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
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
  const base64 = buffer.toString("base64");
  const logoUrl = `data:${file.type};base64,${base64}`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update({ logo_url: logoUrl })
    .eq("slug", slug)
    .select(
      "client_id, company_name, contract_start_date, contract_end_date, monthly_budget, account_manager, service_tier, contract_notes, logo_url"
    )
    .single();

  if (error) throw error;

  return NextResponse.json({
    account: rowToClientAccount(data as unknown as Record<string, unknown>),
    message: "品牌標誌已上傳",
  });
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update({ logo_url: null })
    .eq("slug", slug)
    .select(
      "client_id, company_name, contract_start_date, contract_end_date, monthly_budget, account_manager, service_tier, contract_notes, logo_url"
    )
    .single();

  if (error) throw error;

  return NextResponse.json({
    account: rowToClientAccount(data as unknown as Record<string, unknown>),
    message: "品牌標誌已移除",
  });
}
