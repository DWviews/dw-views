"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  FolderKanban,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { projectPagePath } from "@/lib/project-api";
import { ClientAccountAvatar } from "@/components/dashboard/ClientAccountPanel";
import {
  formatBudget,
  getContractStatus,
  CONTRACT_STATUS_LABELS,
} from "@/lib/client-account";

interface Project {
  id: number;
  name: string;
  slug: string;
  campaign_name: string;
  month_count: number;
  visible_month_count: number;
  creator_name: string;
  company_name?: string | null;
  client_id?: string | null;
  account_manager?: string | null;
  monthly_budget?: number | null;
  logo_url?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((projData) => {
        setProjects(projData.projects || []);
        setUser(projData.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalReports = projects.reduce(
      (sum, p) => sum + p.visible_month_count,
      0
    );
    const readyProjects = projects.filter((p) => p.visible_month_count > 0).length;
    return {
      totalProjects: projects.length,
      totalReports,
      readyProjects,
    };
  }, [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";

  return (
    <div className="dw-page dw-page-wide">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="dw-section-label mb-1">工作區</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#12377A]">
              {isViewer ? "我的客戶報告" : "客戶專案總覽"}
            </h1>
            <p className="text-sm text-[#858481] mt-1 max-w-xl">
              {isViewer
                ? "檢視已發佈的 Google Ads 月度成效報告與關鍵字分析"
                : "管理客戶專案、月度報告發佈與帳戶資料"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/dashboard/admin/projects"
              className="inline-flex items-center justify-center gap-2 bg-[#12377A] text-white px-4 py-2.5 rounded-lg text-sm hover:bg-[#0d2a5e] transition-colors min-h-11 shrink-0"
            >
              <Plus size={16} />
              新增專案
            </Link>
          )}
        </div>

        {projects.length > 0 && (
          <div className="dw-stat-row mt-4 sm:mt-5">
            <div className="dw-stat-pill">
              <FolderKanban size={14} className="text-[#3D8BC1]" />
              <strong>{stats.totalProjects}</strong>
              <span>個專案</span>
            </div>
            <div className="dw-stat-pill">
              <FileText size={14} className="text-[#3D8BC1]" />
              <strong>{stats.totalReports}</strong>
              <span>{isViewer ? "份可查看報告" : "份已發佈報告"}</span>
            </div>
            {!isViewer && (
              <div className="dw-stat-pill">
                <CheckCircle size={14} className="text-[#1e8e3e]" />
                <strong>{stats.readyProjects}</strong>
                <span>個專案可查看</span>
              </div>
            )}
          </div>
        )}
      </header>

      {isViewer && projects.length > 0 && (
        <Link href="/dashboard/subscribe" className="dw-promo-banner mb-6">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#e8f0fe] text-[#12377A] flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#12377A]">
                升級至 Pro 或 Enterprise
              </div>
              <div className="text-xs text-[#858481] mt-0.5">
                解鎖即時監控、AI 出價建議與自動化報告
              </div>
            </div>
          </div>
          <span className="text-sm font-medium text-[#12377A] shrink-0 hidden sm:inline">
            查看方案 →
          </span>
        </Link>
      )}

      {projects.length === 0 ? (
        <div className="dw-card p-10 sm:p-12 text-center">
          <FileText size={44} className="mx-auto text-[#A8D5E5] mb-4" />
          <h2 className="text-lg font-medium text-[#12377A] mb-2">
            尚無可查看的專案
          </h2>
          <p className="text-sm text-[#858481] mb-4 max-w-md mx-auto">
            {isAdmin
              ? "建立第一個客戶專案並上傳 CSV，即可開始生成月度報告。"
              : "報告尚未發佈，新報告上線後將自動顯示於此。"}
          </p>
          {isAdmin ? (
            <Link
              href="/dashboard/admin/projects"
              className="inline-flex items-center gap-2 gads-btn-primary text-sm"
            >
              <Plus size={14} />
              前往專案管理
            </Link>
          ) : (
            <Link
              href="/dashboard/subscribe"
              className="inline-flex items-center gap-1 text-sm text-[#12377A] hover:underline font-medium"
            >
              探索訂閱方案 →
            </Link>
          )}
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#12377A]">客戶專案</h2>
            <span className="text-xs text-[#858481]">
              共 {projects.length} 項
            </span>
          </div>

          <div className="dw-project-grid">
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} isViewer={isViewer} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectCard({
  project: p,
  isViewer,
}: {
  project: Project;
  isViewer: boolean;
}) {
  const contractStatus = getContractStatus(
    p.contract_start_date,
    p.contract_end_date
  );
  const statusMeta = contractStatus
    ? CONTRACT_STATUS_LABELS[contractStatus]
    : null;
  const showCompanyName =
    p.company_name && p.company_name.trim() !== p.name.trim();
  const hasReports = p.visible_month_count > 0;

  return (
    <Link href={projectPagePath(p.slug)} className="dw-project-card group">
      <div className="dw-project-card-head">
        <ClientAccountAvatar logoUrl={p.logo_url} name={p.name} size={44} />
        <div className="dw-project-card-body min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="dw-project-card-title group-hover:text-[#3D8BC1] transition-colors">
              {p.name}
            </h3>
            {statusMeta && !isViewer && (
              <span
                className={`dw-chip shrink-0 ${statusMeta.className}`}
                style={{ fontSize: 10 }}
              >
                <BadgeCheck size={10} />
                {statusMeta.label}
              </span>
            )}
          </div>
          <p className="dw-project-card-sub truncate">{p.campaign_name}</p>
          {showCompanyName && (
            <p className="dw-project-card-company">{p.company_name}</p>
          )}
        </div>
      </div>

      {!isViewer && (p.client_id || p.account_manager || p.monthly_budget != null) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {p.client_id && (
            <span className="dw-chip dw-chip-neutral">#{p.client_id}</span>
          )}
          {p.account_manager && (
            <span className="dw-chip dw-chip-neutral">{p.account_manager}</span>
          )}
          {p.monthly_budget != null && (
            <span className="dw-chip dw-chip-neutral">
              {formatBudget(p.monthly_budget)}
            </span>
          )}
        </div>
      )}

      <div className="dw-project-card-foot">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasReports ? (
            <span className="dw-chip dw-chip-ready">
              <CheckCircle size={11} />
              {p.visible_month_count} 份報告
            </span>
          ) : (
            <span className="dw-chip dw-chip-pending">
              <Clock size={11} />
              待發佈
            </span>
          )}
          {!isViewer && (
            <span className="dw-chip dw-chip-neutral">
              共 {p.month_count} 月
            </span>
          )}
        </div>
        <span className="dw-view-cta inline-flex items-center gap-0.5">
          {isViewer ? "查看報告" : "開啟專案"}
          <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
}
