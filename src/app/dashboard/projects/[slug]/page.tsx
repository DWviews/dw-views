"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle, Clock, Lock, FileText, Search } from "lucide-react";
import { apiProjectPath, fetchProjectJson, projectPagePath, normalizeProjectSlug } from "@/lib/project-api";
import ClientAccountPanel from "@/components/dashboard/ClientAccountPanel";
import DashboardHomeLink from "@/components/dashboard/DashboardHomeLink";

interface ProjectMonth {
  id: number;
  report_month: string;
  report_date_range: string | null;
  status: string;
  views_approved: number;
  csv_count: number;
}

interface Project {
  name: string;
  slug: string;
  campaign_name: string;
}

export default function ProjectMonthPickerPage() {
  const params = useParams();
  const slug = normalizeProjectSlug(params.slug as string);
  const [project, setProject] = useState<Project | null>(null);
  const [months, setMonths] = useState<ProjectMonth[]>([]);
  const [isViewer, setIsViewer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      fetchProjectJson<{
        project: Project;
        months: ProjectMonth[];
      }>(apiProjectPath(slug)),
      fetch("/api/auth/session").then((r) => r.json()),
    ])
      .then(([data, sessionData]) => {
        setProject(data.project);
        setMonths(data.months || []);
        setIsViewer(sessionData.user?.role === "viewer");
        setIsAdmin(sessionData.user?.role === "admin");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "無法載入專案");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="dw-page text-center">
        <p className="text-[#d93025]">{error || "專案不存在"}</p>
        <DashboardHomeLink className="text-[#12377A] text-sm mt-2 inline-block hover:underline">
          返回首頁
        </DashboardHomeLink>
      </div>
    );
  }

  return (
    <div className="dw-page">
      <DashboardHomeLink className="dw-back-link mb-4 min-h-10">
        <ArrowLeft size={14} />
        返回專案列表
      </DashboardHomeLink>

      <header className="mb-5">
        <p className="dw-section-label mb-1">專案報告</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#12377A]">
          {project.name}
        </h1>
        <p className="text-sm text-[#858481] mt-1">{project.campaign_name}</p>
      </header>

      <section className="mb-5">
        <ClientAccountPanel
          slug={slug}
          projectName={project.name}
          canEdit={isAdmin}
          compact
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="dw-section-label mb-1">月度報告</p>
            <h2 className="text-sm font-semibold text-[#12377A]">
              選擇報告月份
            </h2>
          </div>
          <span className="text-xs text-[#858481]">
            {months.length} 個月份
          </span>
        </div>

        {months.length === 0 ? (
          <div className="dw-card p-8 text-center text-sm text-[#858481]">
            {isViewer
              ? "尚無可查看的報告，新報告發佈後將自動顯示於此。"
              : "此專案尚無可查看的月份，請完成資料上傳並發佈後再查看。"}
          </div>
        ) : (
          <div className="space-y-2">
            {months.map((month) => {
              const canOpen = month.status === "ready";
              return (
                <div
                  key={month.id}
                  className="dw-card p-3.5 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#e8f0fe] flex items-center justify-center text-[#12377A] shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-[#12377A]">
                        {month.report_month}
                      </div>
                      <div className="text-xs text-[#858481] mt-0.5 truncate">
                        {month.report_date_range || "尚未設定日期範圍"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        {isViewer ? (
                          <span className="inline-flex items-center gap-1 text-[#1e8e3e]">
                            <CheckCircle size={12} />
                            已發佈 · 可查看
                          </span>
                        ) : (
                          <>
                            {month.status === "ready" ? (
                              <span className="inline-flex items-center gap-1 text-[#1e8e3e]">
                                <CheckCircle size={12} />
                                報告就緒
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#f9ab00]">
                                <Clock size={12} />
                                {month.csv_count}/6 CSV
                              </span>
                            )}
                            {month.views_approved ? (
                              <span className="text-[#1e8e3e]">Views 已開放</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#858481]">
                                <Lock size={12} />
                                待發佈
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {canOpen ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href={projectPagePath(slug, String(month.id))}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#12377A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0d2a5e] min-h-10"
                      >
                        <FileText size={14} />
                        查看報告
                      </Link>
                      <Link
                        href={projectPagePath(slug, `${month.id}/sem`)}
                        className="inline-flex items-center justify-center gap-1.5 border border-[#12377A] text-[#12377A] px-3.5 py-2 rounded-lg text-sm hover:bg-[#e8f0fe] min-h-10"
                      >
                        <Search size={14} />
                        SEM
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-[#858481] shrink-0">資料未完成</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
