/** Client-safe logo URL helpers (no Node.js filesystem imports). */

export interface ClientLogoListItem {
  id: number;
  label: string | null;
  mimeType: string;
  fileSize: number;
  url: string;
  createdAt: string;
}

export function logoPublicUrl(logoId: number): string {
  return `/api/client-logos/${logoId}`;
}

export function isInlineLogoUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("data:"));
}

export function resolveProjectLogoUrl(
  logoId: number | null | undefined,
  legacyLogoUrl: string | null | undefined
): string | null {
  if (logoId) return logoPublicUrl(logoId);
  if (!legacyLogoUrl) return null;
  if (isInlineLogoUrl(legacyLogoUrl)) return null;
  return legacyLogoUrl;
}
