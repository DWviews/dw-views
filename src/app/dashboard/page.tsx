"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, CheckCircle, Clock } from "lucide-react";
import { projectPagePath } from "@/lib/project-api";

interface Project {
  id: number;
  name: string;
  slug: string;
  campaign_name: string;
  month_count: number;
  visible_month_count: number;
  creator_name: string;
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#12377A]">DW VIEWS</h1>
          <p className="text-sm text-[#858481] mt-1">關鍵字搜尋月度報告系統</p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/admin/projects"
            className="inline-flex items-center justify-center gap-2 bg-[#12377A] text-white px-4 py-2.5 rounded-lg text-sm hover:bg-[#0d2a5e] transition-colors min-h-11"
          >
            <Plus size={16} />
            新增專案 / 上傳 CSV
          </Link>
        )}
      </div>

      {isViewer && projects.length > 0 && (
        <Link
          href="/dashboard/subscribe"
          className="mb-6 flex items-center justify-between bg-gradient-to-r from-[#12377A] to-[#3D8BC1] text-white rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div>
            <div className="text-sm font-medium">升級至 Pro 或 Enterprise</div>
            <div className="text-xs text-blue-100 mt-0.5">
              解鎖即時監控、AI 出價建議、自動化報告等進階功能
            </div>
          </div>
          <span className="text-sm font-medium shrink-0">查看方案 →</span>
        </Link>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-[#dadce0] rounded-lg p-12 text-center">
          <FileText size={48} className="mx-auto text-[#A8D5E5] mb-4" />
          <h2 className="text-lg font-medium text-[#12377A] mb-2">尚無可查看的專案</h2>
          <p className="text-sm text-[#858481] mb-4">
            {isAdmin
              ? "請上傳 01-06.csv 檔案建立第一個月度報告"
              : "報告尚未發佈，請稍後再回來查看"}
          </p>
          {isViewer && (
            <Link
              href="/dashboard/subscribe"
              className="inline-flex items-center gap-1 text-sm text-[#12377A] hover:underline font-medium"
            >
              探索訂閱方案，解鎖更多功能 →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={projectPagePath(p.slug)}
              className="bg-white border border-[#dadce0] rounded-lg p-4 sm:p-5 hover:shadow-md transition-shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ background: "linear-gradient(135deg, #12377A, #3D8BC1)" }}
                >
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#12377A] group-hover:text-[#3D8BC1] break-words">
                    {p.name} Google Ads Monthly Report
                  </h3>
                  <p className="text-sm text-[#858481]">{p.campaign_name}</p>
                  <p className="text-xs text-[#858481] mt-0.5">
                    {isViewer
                      ? `${p.visible_month_count} 份可查看報告`
                      : `${p.visible_month_count} 個可查看月份`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {isViewer ? (
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle size={14} className="text-[#1e8e3e]" />
                      <span className="text-[#1e8e3e]">
                        {p.visible_month_count} 份報告可查看
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-xs">
                        {p.visible_month_count > 0 ? (
                          <>
                            <CheckCircle size={14} className="text-[#1e8e3e]" />
                            <span className="text-[#1e8e3e]">可查看</span>
                          </>
                        ) : (
                          <>
                            <Clock size={14} className="text-[#f9ab00]" />
                            <span className="text-[#f9ab00]">待發佈</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-[#858481] mt-1">
                        共 {p.month_count} 個月份 · {p.creator_name}
                      </div>
                    </>
                  )}
                </div>
                <ChevronRight className="text-[#A8D5E5] group-hover:text-[#3D8BC1]" size={20} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
