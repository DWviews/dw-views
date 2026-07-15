"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReportViewer from "@/components/report/ReportViewer";
import MonthReportNav from "@/components/dashboard/MonthReportNav";
import type { ReportData } from "@/lib/report-engine";
import {
  apiProjectPath,
  fetchProjectJson,
  normalizeProjectSlug,
} from "@/lib/project-api";

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
      <div className="dw-page">
        <MonthReportNav slug={slug} monthId={monthId} active="report" />
        <p className="text-[#d93025]">{error || "報告不存在"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F2F9FC]">
      <div className="dw-page dw-page-wide">
        <MonthReportNav
          slug={slug}
          monthId={monthId}
          active="report"
          projectName={projectName}
          reportMonth={reportMonth}
        />
        <ReportViewer
          report={report}
          projectName={projectName}
          projectSlug={slug}
          monthId={monthId}
          reportMonth={reportMonth}
        />
      </div>
    </div>
  );
}
