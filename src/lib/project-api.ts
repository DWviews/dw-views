export { apiProjectPath, projectPagePath, normalizeProjectSlug } from "./project-slug";

export async function fetchProjectJson<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, init);
  const text = await res.text();

  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(
        res.ok
          ? "伺服器回應格式錯誤"
          : `伺服器錯誤 (${res.status})，請稍後再試`
      );
    }
  }

  if (!res.ok) {
    const message =
      typeof data.error === "string" ? data.error : `載入失敗 (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
