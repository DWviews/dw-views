"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearDashboardReturnPath,
  isDashboardRoot,
  maskBrowserUrlToDashboard,
  peekDashboardReturnPath,
  saveDashboardReturnPath,
} from "@/lib/dashboard-url-mask";

/**
 * Keep the visible address bar at /dashboard/ while Next.js
 * continues serving the real nested dashboard routes.
 */
export default function DashboardUrlMask() {
  const pathname = usePathname();
  const router = useRouter();
  const restoring = useRef(false);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;

    if (!isDashboardRoot(pathname)) {
      saveDashboardReturnPath(pathname);
      maskBrowserUrlToDashboard();
      return;
    }

    const returnTo = peekDashboardReturnPath();
    if (returnTo && !isDashboardRoot(returnTo) && !restoring.current) {
      restoring.current = true;
      router.replace(returnTo);
      // Allow future restores after this navigation settles.
      window.setTimeout(() => {
        restoring.current = false;
      }, 800);
      return;
    }
  }, [pathname, router]);

  useEffect(() => {
    const onPopState = () => {
      // Keep the bar on /dashboard/ even if history entries exist.
      maskBrowserUrlToDashboard();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}

export function goDashboardHome(router: { push: (href: string) => void }) {
  clearDashboardReturnPath();
  router.push("/dashboard");
}
