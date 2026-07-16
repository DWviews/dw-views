import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import {
  CLIENT_ACCOUNT_FIELDS,
  clientAccountToDbUpdates,
  enrichClientAccount,
  type ClientAccount,
  type ServiceTier,
} from "@/lib/client-account";

const ACCOUNT_SELECT = [...CLIENT_ACCOUNT_FIELDS, "logo_id"].join(", ");

async function loadAccount(slug: string) {
  const project = await getProjectBySlug(slug);
  if (!project) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(ACCOUNT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    project,
    account: enrichClientAccount(data as unknown as Record<string, unknown>),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const result = await loadAccount(slug);
  if (!result) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  return NextResponse.json({
    account: result.account,
    canEdit: session.role === "admin",
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可修改客戶帳戶資料" }, { status: 403 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<{
    clientId: string;
    companyName: string;
    contractStartDate: string;
    contractEndDate: string;
    monthlyBudget: number | null;
    accountManager: string;
    serviceTier: ServiceTier | null;
    contractNotes: string;
  }>;

  if (
    body.contractStartDate &&
    body.contractEndDate &&
    body.contractStartDate > body.contractEndDate
  ) {
    return NextResponse.json(
      { error: "合約生效日不可晚於到期日" },
      { status: 400 }
    );
  }

  if (body.monthlyBudget != null && body.monthlyBudget < 0) {
    return NextResponse.json(
      { error: "每月媒體預算不可為負數" },
      { status: 400 }
    );
  }

  const validTiers = ["basic", "professional", "enterprise", "custom", null];
  if (body.serviceTier !== undefined && !validTiers.includes(body.serviceTier)) {
    return NextResponse.json({ error: "服務方案無效" }, { status: 400 });
  }

  const updates = clientAccountToDbUpdates(body as Partial<ClientAccount>);
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("slug", slug)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) throw error;

  return NextResponse.json({
    account: enrichClientAccount(data as unknown as Record<string, unknown>),
    message: "客戶帳戶資料已儲存",
  });
}
