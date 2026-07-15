"use client";

import Link from "next/link";
import { ArrowLeft, FileText, LayoutDashboard, Search, Table2 } from "lucide-react";
import { projectPagePath } from "@/lib/project-api";
import DashboardHomeLink from "@/components/dashboard/DashboardHomeLink";

export type MonthNavTab = "report" | "ads" | "sem" | "keywords";

const TABS: {
  id: MonthNavTab;
  label: string;
  suffix: string;
  icon: typeof FileText;
}[] = [
  { id: "report", label: "月度報告", suffix: "", icon: FileText },
  { id: "ads", label: "數據儀表板", suffix: "/ads", icon: LayoutDashboard },
  { id: "sem", label: "SEM Search", suffix: "/sem", icon: Search },
  { id: "keywords", label: "關鍵字", suffix: "/keywords", icon: Table2 },
];

export default function MonthReportNav({
  slug,
  monthId,
  active,
  reportMonth,
  projectName,
}: {
  slug: string;
  monthId: string;
  active: MonthNavTab;
  reportMonth?: string;
  projectName?: string;
}) {
  const monthBase = projectPagePath(slug, String(monthId));

  return (
    <div className="mb-5 sm:mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <DashboardHomeLink className="dw-back-link min-h-10">
          <ArrowLeft size={14} />
          首頁
        </DashboardHomeLink>
        <span className="text-[#dadce0]" aria-hidden>
          /
        </span>
        <Link
          href={projectPagePath(slug)}
          className="text-[#858481] hover:text-[#12377A] min-h-10 inline-flex items-center"
        >
          月份選擇
        </Link>
        {(projectName || reportMonth) && (
          <>
            <span className="text-[#dadce0]" aria-hidden>
              /
            </span>
            <span className="text-[#202124] font-medium truncate max-w-[12rem] sm:max-w-none">
              {[projectName, reportMonth].filter(Boolean).join(" · ")}
            </span>
          </>
        )}
      </div>

      <nav
        className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide"
        aria-label="報告分頁"
      >
        {TABS.map((tab) => {
          const href = `${monthBase}${tab.suffix}`;
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={href}
              className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-2.5 text-sm min-h-11 transition-colors ${
                isActive
                  ? "bg-[#12377A] text-white font-medium shadow-sm"
                  : "bg-white text-[#5f6368] border border-[#dadce0] hover:border-[#3D8BC1] hover:text-[#12377A]"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
