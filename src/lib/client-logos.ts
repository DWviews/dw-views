import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "./supabase";
import { formatDbError, toDbError } from "./db-error";
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
  storage_backend: "local" | "supabase" | "database";
  content_base64?: string | null;
  created_at: string;
}

function extensionForMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? "bin";
}

function requiresRemoteStorage(): boolean {
  return Boolean(process.env.VERCEL);
}

function localLogoDir(): string {
  return path.join(process.cwd(), "data", "client-logos");
}

function localLogoFilePath(storagePath: string): string {
  return path.join(localLogoDir(), storagePath);
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function readFromSupabaseStorage(storagePath: string): Promise<Buffer | null> {
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

async function saveLogoContent(
  logoId: number,
  buffer: Buffer,
  mimeType: string
): Promise<Pick<ClientLogoRecord, "storage_path" | "storage_backend" | "content_base64">> {
  const storagePath = `${logoId}.${extensionForMime(mimeType)}`;

  // Primary: store in database so every contract can reuse without Storage bucket.
  return {
    storage_path: storagePath,
    storage_backend: "database",
    content_base64: buffer.toString("base64"),
  };
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
      storage_backend: "database",
    })
    .select("*")
    .single();

  if (insertError || !row) throw toDbError(insertError, "建立標誌記錄失敗");

  const contentMeta = await saveLogoContent(row.id as number, buffer, mimeType);

  const { data: updated, error: updateError } = await supabase
    .from("client_logos")
    .update(contentMeta)
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    await supabase.from("client_logos").delete().eq("id", row.id);
    throw toDbError(updateError, "儲存標誌內容失敗");
  }

  return updated as ClientLogoRecord;
}

/** Import legacy per-project base64 logos into the shared library. */
async function syncLegacyProjectLogos(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, logo_url, logo_id")
    .is("logo_id", null)
    .like("logo_url", "data:%");

  if (error || !projects?.length) return;

  for (const project of projects) {
    const logoUrl = project.logo_url as string;
    const parsed = parseDataUrl(logoUrl);
    if (!parsed || !ALLOWED_LOGO_TYPES.has(parsed.mimeType)) continue;
    if (parsed.buffer.byteLength > MAX_LOGO_BYTES) continue;

    try {
      const logo = await uploadClientLogo(
        parsed.buffer,
        parsed.mimeType,
        (project.name as string) || null
      );
      await assignLogoToProject(project.id as number, logo.id);
    } catch {
      // Skip rows that fail migration and continue with others.
    }
  }
}

export async function listClientLogos(): Promise<ClientLogoListItem[]> {
  await syncLegacyProjectLogos();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("client_logos")
    .select("id, label, mime_type, file_size, created_at")
    .order("created_at", { ascending: false });

  if (error) throw toDbError(error, "無法載入標誌素材庫");

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

  if (error) throw toDbError(error, "無法載入標誌素材庫");
  return (data as ClientLogoRecord | null) ?? null;
}

export async function readClientLogoBytes(
  logo: ClientLogoRecord
): Promise<Buffer | null> {
  if (logo.storage_backend === "database" && logo.content_base64) {
    return Buffer.from(logo.content_base64, "base64");
  }

  if (logo.storage_backend === "supabase" || requiresRemoteStorage()) {
    const remote = await readFromSupabaseStorage(logo.storage_path);
    if (remote) return remote;
    if (requiresRemoteStorage()) return null;
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

  if (error) throw toDbError(error, "無法套用標誌至專案");
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
