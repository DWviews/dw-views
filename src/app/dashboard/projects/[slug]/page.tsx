"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle, Clock, Lock } from "lucide-react";
import { apiProjectPath, fetchProjectJson, projectPagePath, normalizeProjectSlug } from "@/lib/project-api";

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
      <div className="p-8 text-center">
        <p className="text-[#d93025]">{error || "專案不存在"}</p>
        <Link href="/dashboard" className="text-[#12377A] text-sm mt-2 inline-block hover:underline">
          返回首頁
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[#858481] hover:text-[#12377A] mb-4"
      >
        <ArrowLeft size={14} />
        返回專案列表
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#12377A]">{project.name}</h1>
        <p className="text-sm text-[#858481] mt-1">{project.campaign_name}</p>
        <p className="text-sm text-[#858481] mt-2">請選擇要查看的報告月份</p>
      </div>

      {months.length === 0 ? (
        <div className="bg-white border border-[#dadce0] rounded-lg p-10 text-center text-sm text-[#858481]">
          {isViewer
            ? "尚無可查看的報告，新報告發佈後將自動顯示於此。"
            : "此專案尚無可查看的月份，請完成資料上傳並發佈後再查看。"}
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const canOpen = month.status === "ready";
            return (
              <div
                key={month.id}
                className="bg-white border border-[#dadce0] rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e8f0fe] flex items-center justify-center text-[#12377A]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[#12377A]">
                      {month.report_month}
                    </div>
                    <div className="text-xs text-[#858481] mt-0.5">
                      {month.report_date_range || "尚未設定日期範圍"}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
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
                  <Link
                    href={projectPagePath(slug, String(month.id))}
                    className="bg-[#12377A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0d2a5e]"
                  >
                    查看報告
                  </Link>
                ) : (
                  <span className="text-xs text-[#858481]">資料未完成</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
