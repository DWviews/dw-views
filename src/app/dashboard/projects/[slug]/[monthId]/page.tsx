"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReportViewer from "@/components/report/ReportViewer";
import type { ReportData } from "@/lib/report-engine";
import { apiProjectPath, fetchProjectJson, projectPagePath, normalizeProjectSlug } from "@/lib/project-api";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export default function ProjectReportPage() {
  const params = useParams();
  const slug = normalizeProjectSlug(params.slug as string);
  const monthId = params.monthId as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !monthId) return;

    fetchProjectJson<{
      report: ReportData;
      project: { name: string };
      month: { report_month: string };
    }>(apiProjectPath(slug, `months/${monthId}`))
      .then((data) => {
        setReport(data.report);
        setProjectName(data.project.name);
        setReportMonth(data.month.report_month);
      })
      .catch((err) => {
        const message =
          err instanceof TypeError && err.message === "Failed to fetch"
            ? "無法連線至伺服器，請確認服務是否運行中"
            : err instanceof Error
              ? err.message
              : "無法載入報告";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [slug, monthId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#d93025]">{error || "報告不存在"}</p>
        <Link
          href={projectPagePath(slug)}
          className="text-[#12377A] text-sm mt-2 inline-block hover:underline"
        >
          返回月份選擇
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F2F9FC] min-h-full">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={projectPagePath(slug)}
          className="inline-flex items-center gap-1 text-sm text-[#858481] hover:text-[#12377A]"
        >
          <ArrowLeft size={14} />
          返回月份選擇
        </Link>
        <Link
          href={projectPagePath(slug, `${monthId}/ads`)}
          className="inline-flex items-center gap-2 bg-[#1a73e8] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1557b0]"
        >
          <LayoutDashboard size={16} />
          查看數據儀表板
        </Link>
      </div>
      <ReportViewer
        report={report}
        projectName={projectName}
        projectSlug={slug}
        monthId={monthId}
        reportMonth={reportMonth}
      />
    </div>
  );
}
