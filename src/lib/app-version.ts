/** Build-time version from Git commit (see next.config.ts). */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";

export function copyrightLine(suffix?: string): string {
  const base = `© 2026 Diamond Wise Company · ${APP_VERSION}`;
  return suffix ? `${base} · ${suffix}` : base;
}
