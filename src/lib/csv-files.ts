import { getSupabaseAdmin } from "./supabase";

export async function loadMonthCsvFiles(
  monthId: number
): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_csv_files")
    .select("file_type, raw_content")
    .eq("project_month_id", monthId);

  if (error) throw error;

  const files: Record<string, string> = {};
  for (const row of data ?? []) {
    files[row.file_type] = row.raw_content;
  }
  return files;
}

export async function upsertMonthCsvFiles(
  projectId: number,
  monthId: number,
  files: Record<string, string>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const [fileType, rawContent] of Object.entries(files)) {
    const { error } = await supabase.from("project_csv_files").upsert(
      {
        project_id: projectId,
        project_month_id: monthId,
        file_type: fileType,
        raw_content: rawContent,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "project_month_id,file_type" }
    );
    if (error) throw error;
  }
}

export async function insertMonthCsvFiles(
  projectId: number,
  monthId: number,
  files: Record<string, string>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const rows = Object.entries(files).map(([fileType, rawContent]) => ({
    project_id: projectId,
    project_month_id: monthId,
    file_type: fileType,
    raw_content: rawContent,
  }));

  const { error } = await supabase.from("project_csv_files").insert(rows);
  if (error) throw error;
}

export async function getCsvFileContent(
  monthId: number,
  fileType: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_csv_files")
    .select("raw_content")
    .eq("project_month_id", monthId)
    .eq("file_type", fileType)
    .maybeSingle();

  if (error) throw error;
  return data?.raw_content ?? null;
}

export async function getCsvFileCount(monthId: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("project_csv_files")
    .select("*", { count: "exact", head: true })
    .eq("project_month_id", monthId);

  if (error) throw error;
  return count ?? 0;
}
