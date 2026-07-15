"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { goDashboardHome } from "@/components/dashboard/DashboardUrlMask";

/**
 * Navigate to /dashboard while clearing the URL-mask return path,
 * so "首頁 / 返回專案列表" is not bounced back to a nested page.
 */
export default function DashboardHomeLink({
  children,
  className,
  href = "/dashboard",
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        goDashboardHome(router);
      }}
    >
      {children}
    </Link>
  );
}
