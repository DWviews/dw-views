import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";
import { createProjectMonth } from "@/lib/project-months";

export async function GET() {
  await seedDatabase();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const isPrivileged = session.role === "admin" || session.role === "editor";
  const supabase = getSupabaseAdmin();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const enriched = [];
  for (const project of projects ?? []) {
    const { data: creator } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", project.created_by)
      .maybeSingle();

    const { count: monthCount } = await supabase
      .from("project_months")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id);

    let visibleQuery = supabase
      .from("project_months")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "ready");

    if (!isPrivileged) {
      visibleQuery = visibleQuery.eq("views_approved", true);
    }

    const { count: visibleMonthCount } = await visibleQuery;

    if (!isPrivileged && (visibleMonthCount ?? 0) === 0) continue;

    enriched.push({
      ...project,
      creator_name: creator?.display_name,
      month_count: monthCount ?? 0,
      visible_month_count: visibleMonthCount ?? 0,
    });
  }

  return NextResponse.json({ projects: enriched });
}

export async function POST(request: NextRequest) {
  await seedDatabase();
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { name, campaignName, reportMonth } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "請填寫專案名稱" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "專案名稱已存在" }, { status: 409 });
  }

  const monthLabel =
    reportMonth ||
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      slug,
      campaign_name: campaignName || name,
      report_month: monthLabel,
      created_by: session.id,
    })
    .select("id, name, slug")
    .single();

  if (error) throw error;

  const month = await createProjectMonth(project.id, monthLabel);

  return NextResponse.json({ project, month });
}
