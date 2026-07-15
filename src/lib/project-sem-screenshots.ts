import { getSupabaseAdmin } from "./supabase";

export interface SemScreenshot {
  id: number;
  project_month_id: number;
  title: string;
  image_data: string;
  mime_type: string;
  sort_order: number;
  uploaded_at: string;
}

function mapRow(row: Record<string, unknown>): SemScreenshot {
  return {
    id: row.id as number,
    project_month_id: row.project_month_id as number,
    title: (row.title as string) || "",
    image_data: row.image_data as string,
    mime_type: row.mime_type as string,
    sort_order: (row.sort_order as number) ?? 0,
    uploaded_at: row.uploaded_at as string,
  };
}

export async function listSemScreenshots(
  monthId: number
): Promise<SemScreenshot[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_sem_screenshots")
    .select(
      "id, project_month_id, title, image_data, mime_type, sort_order, uploaded_at"
    )
    .eq("project_month_id", monthId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function countSemScreenshots(monthId: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("project_sem_screenshots")
    .select("id", { count: "exact", head: true })
    .eq("project_month_id", monthId);

  if (error) throw error;
  return count ?? 0;
}

export async function createSemScreenshot(input: {
  monthId: number;
  title: string;
  imageData: string;
  mimeType: string;
  uploadedBy: number;
}): Promise<SemScreenshot> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("project_sem_screenshots")
    .select("id", { count: "exact", head: true })
    .eq("project_month_id", input.monthId);

  const { data, error } = await supabase
    .from("project_sem_screenshots")
    .insert({
      project_month_id: input.monthId,
      title: input.title.trim() || "SEM Search 截圖",
      image_data: input.imageData,
      mime_type: input.mimeType,
      sort_order: count ?? 0,
      uploaded_by: input.uploadedBy,
    })
    .select(
      "id, project_month_id, title, image_data, mime_type, sort_order, uploaded_at"
    )
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function deleteSemScreenshot(
  monthId: number,
  screenshotId: number
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_sem_screenshots")
    .delete()
    .eq("id", screenshotId)
    .eq("project_month_id", monthId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function updateSemScreenshotTitle(
  monthId: number,
  screenshotId: number,
  title: string
): Promise<SemScreenshot | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_sem_screenshots")
    .update({ title: title.trim() || "SEM Search 截圖" })
    .eq("id", screenshotId)
    .eq("project_month_id", monthId)
    .select(
      "id, project_month_id, title, image_data, mime_type, sort_order, uploaded_at"
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}
