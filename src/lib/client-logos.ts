import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "./supabase";
import { logoPublicUrl, type ClientLogoListItem } from "./client-logo-url";

export { logoPublicUrl, resolveProjectLogoUrl, isInlineLogoUrl } from "./client-logo-url";
export type { ClientLogoListItem } from "./client-logo-url";

export const LOGO_BUCKET = "client-logos";
export const MAX_LOGO_BYTES = 512 * 1024;
export const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export interface ClientLogoRecord {
  id: number;
  label: string | null;
  mime_type: string;
  storage_path: string;
  file_size: number;
  storage_backend: "local" | "supabase";
  created_at: string;
}

function extensionForMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? "bin";
}

function localLogoDir(): string {
  return path.join(process.cwd(), "data", "client-logos");
}

function localLogoFilePath(storagePath: string): string {
  return path.join(localLogoDir(), storagePath);
}

async function saveToLocal(storagePath: string, buffer: Buffer): Promise<void> {
  const dir = localLogoDir();
  await mkdir(dir, { recursive: true });
  await writeFile(localLogoFilePath(storagePath), buffer);
}

async function saveToSupabase(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
  return !error;
}

async function readFromSupabase(storagePath: string): Promise<Buffer | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function readFromLocal(storagePath: string): Promise<Buffer | null> {
  try {
    return await readFile(localLogoFilePath(storagePath));
  } catch {
    return null;
  }
}

export async function uploadClientLogo(
  buffer: Buffer,
  mimeType: string,
  label?: string | null
): Promise<ClientLogoRecord> {
  if (!ALLOWED_LOGO_TYPES.has(mimeType)) {
    throw new Error("不支援的圖片格式");
  }
  if (buffer.byteLength > MAX_LOGO_BYTES) {
    throw new Error("圖片大小不可超過 512 KB");
  }

  const supabase = getSupabaseAdmin();
  const placeholderPath = `pending-${crypto.randomUUID()}`;
  const { data: row, error: insertError } = await supabase
    .from("client_logos")
    .insert({
      label: label?.trim() || null,
      mime_type: mimeType,
      storage_path: placeholderPath,
      file_size: buffer.byteLength,
      storage_backend: "local",
    })
    .select("*")
    .single();

  if (insertError || !row) throw insertError ?? new Error("建立標誌記錄失敗");

  const storagePath = `${row.id}.${extensionForMime(mimeType)}`;
  const useSupabase = await saveToSupabase(storagePath, buffer, mimeType);
  const storageBackend = useSupabase ? "supabase" : "local";

  if (!useSupabase) {
    await saveToLocal(storagePath, buffer);
  }

  const { data: updated, error: updateError } = await supabase
    .from("client_logos")
    .update({
      storage_path: storagePath,
      storage_backend: storageBackend,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateError || !updated) throw updateError ?? new Error("更新標誌路徑失敗");
  return updated as ClientLogoRecord;
}

export async function listClientLogos(): Promise<ClientLogoListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("client_logos")
    .select("id, label, mime_type, file_size, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as number,
    label: (row.label as string | null) ?? null,
    mimeType: row.mime_type as string,
    fileSize: row.file_size as number,
    url: logoPublicUrl(row.id as number),
    createdAt: row.created_at as string,
  }));
}

export async function getClientLogo(
  logoId: number
): Promise<ClientLogoRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("client_logos")
    .select("*")
    .eq("id", logoId)
    .maybeSingle();

  if (error) throw error;
  return (data as ClientLogoRecord | null) ?? null;
}

export async function readClientLogoBytes(
  logo: ClientLogoRecord
): Promise<Buffer | null> {
  if (logo.storage_backend === "supabase") {
    const remote = await readFromSupabase(logo.storage_path);
    if (remote) return remote;
  }
  return readFromLocal(logo.storage_path);
}

export async function assignLogoToProject(
  projectId: number,
  logoId: number | null
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  if (logoId) {
    const logo = await getClientLogo(logoId);
    if (!logo) throw new Error("標誌不存在");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      logo_id: logoId,
      logo_url: logoId ? logoPublicUrl(logoId) : null,
    })
    .eq("id", projectId);

  if (error) throw error;
  return logoId ? logoPublicUrl(logoId) : null;
}

export function toLogoListItem(logo: ClientLogoRecord): ClientLogoListItem {
  return {
    id: logo.id,
    label: logo.label,
    mimeType: logo.mime_type,
    fileSize: logo.file_size,
    url: logoPublicUrl(logo.id),
    createdAt: logo.created_at,
  };
}
