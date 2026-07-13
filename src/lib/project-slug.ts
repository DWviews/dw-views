export function normalizeProjectSlug(
  slug: string | string[] | undefined
): string {
  if (!slug) return "";
  const raw = Array.isArray(slug) ? slug[0] : slug;
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function resolveProjectSlugCandidates(slug: string): string[] {
  const normalized = normalizeProjectSlug(slug);
  const lower = normalized.toLowerCase();
  return [...new Set([normalized, lower].filter(Boolean))];
}

export function encodeProjectSlug(slug: string): string {
  const normalized = normalizeProjectSlug(slug);
  if (!normalized) return "";
  return encodeURIComponent(normalized);
}

export function projectPagePath(slug: string, suffix = ""): string {
  const encoded = encodeProjectSlug(slug);
  const base = `/dashboard/projects/${encoded}`;
  if (!suffix) return base;
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function apiProjectPath(slug: string, suffix = ""): string {
  const encoded = encodeProjectSlug(slug);
  const base = `/api/projects/${encoded}`;
  if (!suffix) return base;
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}
