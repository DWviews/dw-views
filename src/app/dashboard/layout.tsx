"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, FolderOpen, Users, LogOut, Sparkles } from "lucide-react";
import DashboardUrlMask, {
  goDashboardHome,
} from "@/components/dashboard/DashboardUrlMask";
import { clearDashboardReturnPath } from "@/lib/dashboard-url-mask";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  displayName: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    clearDashboardReturnPath();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F9FC]">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isViewer = user.role === "viewer";
  const nav = [
    { href: "/dashboard", label: "首頁", icon: Home, home: true },
    ...(isViewer
      ? [
          {
            href: "/dashboard/subscribe",
            label: "訂閱方案",
            icon: Sparkles,
            home: false,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/dashboard/admin/projects",
            label: "專案管理",
            icon: FolderOpen,
            home: false,
          },
          {
            href: "/dashboard/admin/users",
            label: "帳號管理",
            icon: Users,
            home: false,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F9FC]">
      <DashboardUrlMask />
      <header className="h-14 border-b border-[#dadce0] bg-white flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2 mr-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #12377A, #3D8BC1)" }}
          >
            DW
          </div>
          <span className="text-base font-semibold text-[#12377A]">DW VIEWS</span>
        </div>

        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.home
              ? pathname === "/dashboard" || pathname === "/dashboard/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (item.home) {
                    e.preventDefault();
                    goDashboardHome(router);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#e8f0fe] text-[#12377A] font-medium"
                    : "text-[#858481] hover:bg-[#f1f3f4]"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-[#12377A]">
              {user.displayName}
            </div>
            {user.role !== "viewer" && (
              <div className="text-xs text-[#858481]">
                {user.role === "admin" ? "管理員" : "編輯者"}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-[#f1f3f4] rounded-full text-[#858481]"
            title="登出"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
