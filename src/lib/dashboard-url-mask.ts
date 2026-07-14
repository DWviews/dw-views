const STORAGE_KEY = "dw_views_dashboard_return";

export function saveDashboardReturnPath(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/dashboard")) return;
  if (path === "/dashboard" || path === "/dashboard/") {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function peekDashboardReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearDashboardReturnPath() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isDashboardRoot(path: string): boolean {
  return path === "/dashboard" || path === "/dashboard/";
}

export function maskBrowserUrlToDashboard() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/dashboard" && window.location.pathname !== "/dashboard/") {
    window.history.replaceState(window.history.state, "", "/dashboard/");
  }
}
