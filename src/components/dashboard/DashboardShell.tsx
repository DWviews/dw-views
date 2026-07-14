"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FolderOpen,
  Users,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import DashboardUrlMask, {
  goDashboardHome,
} from "@/components/dashboard/DashboardUrlMask";
import { clearDashboardReturnPath } from "@/lib/dashboard-url-mask";
import type { SessionUser } from "@/lib/auth";

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function handleLogout() {
    clearDashboardReturnPath();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
  }

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

  function NavLinks({ mobile = false }: { mobile?: boolean }) {
    return (
      <>
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
                setMenuOpen(false);
              }}
              className={`flex items-center gap-2 rounded-lg text-sm transition-colors ${
                mobile
                  ? "min-h-11 px-4 py-3 w-full"
                  : "gap-1.5 px-3 py-1.5"
              } ${
                active
                  ? "bg-[#e8f0fe] text-[#12377A] font-medium"
                  : "text-[#858481] hover:bg-[#f1f3f4]"
              }`}
            >
              <Icon size={mobile ? 18 : 16} />
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F9FC] overflow-x-clip">
      <DashboardUrlMask />
      <header className="h-14 border-b border-[#dadce0] bg-white flex items-center px-3 sm:px-6 shrink-0 gap-2">
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-[#12377A] hover:bg-[#f1f3f4]"
          aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="flex items-center gap-2 mr-2 sm:mr-8 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #12377A, #3D8BC1)" }}
          >
            DW
          </div>
          <span className="text-base font-semibold text-[#12377A] truncate">
            DW VIEWS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLinks />
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 hover:bg-[#f1f3f4] rounded-full text-[#858481]"
            title="登出"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 top-14 z-40 bg-black/30"
            aria-label="關閉選單"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-50 bg-white border-b border-[#dadce0] shadow-lg px-3 py-3 space-y-1">
            <div className="px-4 py-2 text-sm text-[#12377A] font-medium sm:hidden">
              {user.displayName}
              {user.role !== "viewer" && (
                <span className="ml-2 text-xs text-[#858481] font-normal">
                  {user.role === "admin" ? "管理員" : "編輯者"}
                </span>
              )}
            </div>
            <NavLinks mobile />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto overflow-x-clip min-w-0">
        {children}
      </main>
    </div>
  );
}
