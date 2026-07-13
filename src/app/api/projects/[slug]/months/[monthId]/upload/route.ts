import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { parse01 } from "@/lib/csv-parser";
import {
  getProjectMonthForProject,
  refreshMonthStatus,
} from "@/lib/project-months";
import { getProjectBySlug } from "@/lib/project-report";

const VALID_TYPES = ["01", "02", "03", "04", "05", "06"];

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

  const supabase = getSupabaseAdmin();
  const formData = await request.formData();
  const uploaded: string[] = [];

  for (const fileType of VALID_TYPES) {
    const file = formData.get(`file_${fileType}`) as File | null;
    if (!file || file.size === 0) continue;

    const rawContent = await file.text();
    const content =
      rawContent.includes("\u0000")
        ? Buffer.from(await file.arrayBuffer()).toString("utf16le")
        : rawContent;

    const { error } = await supabase.from("project_csv_files").upsert(
      {
        project_id: project.id,
        project_month_id: month.id,
        file_type: fileType,
        raw_content: content,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "project_month_id,file_type" }
    );
    if (error) throw error;

    uploaded.push(fileType);

    if (fileType === "01") {
      const campaign = parse01(content);
      if (campaign) {
        await supabase
          .from("projects")
          .update({ campaign_name: campaign.campaign })
          .eq("id", project.id);
        await supabase
          .from("project_months")
          .update({ report_date_range: campaign.dateRange })
          .eq("id", month.id);
      }
    }
  }

  await refreshMonthStatus(month.id);
  const updated = await getProjectMonthForProject(project.id, id);

  return NextResponse.json({
    uploaded,
    csvCount: updated?.csv_count ?? 0,
    status: updated?.status ?? "draft",
    month: updated,
  });
}
