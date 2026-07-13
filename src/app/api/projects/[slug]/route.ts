import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/project-report";
import { listProjectMonths } from "@/lib/project-months";

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

  return NextResponse.json({
    project,
    months,
    canManage: session.role === "admin" || session.role === "editor",
    canApprove: session.role === "admin",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { slug } = await params;
  const body = await request.json();
  const { campaignName, name } = body as {
    campaignName?: string;
    name?: string;
  };

  const supabase = getSupabaseAdmin();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }

  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name;
  if (campaignName !== undefined) updates.campaign_name = campaignName;

  const { data: updated, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json({ project: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("projects").delete().eq("slug", slug);
  if (error) throw error;

  return NextResponse.json({ message: "已刪除" });
}
