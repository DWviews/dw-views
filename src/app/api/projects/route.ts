import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";
import { createProjectMonth } from "@/lib/project-months";
import { resolveProjectLogoUrl } from "@/lib/client-logo-url";

const PROJECT_LIST_SELECT = [
  "id",
  "name",
  "slug",
  "campaign_name",
  "created_by",
  "created_at",
  "client_id",
  "company_name",
  "contract_start_date",
  "contract_end_date",
  "monthly_budget",
  "account_manager",
  "service_tier",
  "logo_id",
].join(", ");

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const isPrivileged = session.role === "admin" || session.role === "editor";
  const supabase = getSupabaseAdmin();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(PROJECT_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!projects?.length) {
    return NextResponse.json({ projects: [] });
  }

  const projectIds = (projects as unknown as { id: number }[]).map((p) => p.id);
  const creatorIds = [
    ...new Set(
      (projects as unknown as { created_by: number | null }[])
        .map((p) => p.created_by)
        .filter((id): id is number => typeof id === "number")
    ),
  ];

  const [creatorsRes, monthsRes] = await Promise.all([
    creatorIds.length
      ? supabase.from("users").select("id, display_name").in("id", creatorIds)
      : Promise.resolve({ data: [] as { id: number; display_name: string }[] }),
    supabase
      .from("project_months")
      .select("project_id, status, views_approved")
      .in("project_id", projectIds),
  ]);

  if (creatorsRes && "error" in creatorsRes && creatorsRes.error) {
    throw creatorsRes.error;
  }
  if (monthsRes.error) throw monthsRes.error;

  const creatorMap = new Map(
    (creatorsRes.data ?? []).map((u) => [u.id, u.display_name])
  );

  const stats = new Map<
    number,
    { monthCount: number; visibleMonthCount: number }
  >();
  for (const id of projectIds) {
    stats.set(id, { monthCount: 0, visibleMonthCount: 0 });
  }

  for (const row of monthsRes.data ?? []) {
    const pid = row.project_id as number;
    const entry = stats.get(pid);
    if (!entry) continue;
    entry.monthCount += 1;
    const visible =
      row.status === "ready" &&
      (isPrivileged || row.views_approved === true);
    if (visible) entry.visibleMonthCount += 1;
  }

  const enriched = [];
  for (const project of projects as unknown as Record<string, unknown>[]) {
    const entry = stats.get(project.id as number) ?? {
      monthCount: 0,
      visibleMonthCount: 0,
    };
    if (!isPrivileged && entry.visibleMonthCount === 0) continue;

    enriched.push({
      ...project,
      logo_url: resolveProjectLogoUrl(
        project.logo_id as number | null,
        null
      ),
      creator_name: creatorMap.get(project.created_by as number),
      month_count: entry.monthCount,
      visible_month_count: entry.visibleMonthCount,
    });
  }

  return NextResponse.json({
    projects: enriched,
    user: { role: session.role },
  });
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
