"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectAdsDashboard from "@/components/dashboard/ProjectAdsDashboard";
import {
  apiProjectPath,
  fetchProjectJson,
  normalizeProjectSlug,
} from "@/lib/project-api";
import type { ReportData } from "@/lib/report-engine";
import type { KeywordRow } from "@/lib/keyword-parser";
import type { DemographicRow, DeviceRow } from "@/lib/csv-parser";
import type {
  DailyTrendPoint,
  DailyTrendPromoConfig,
  WeekdayChartPoint,
} from "@/lib/daily-trend-shared";

interface PreviousMonthComparison {
  reportMonth: string;
  clicks: number;
  conversions: number;
  cost: number;
  costPerConversion: number;
}

export default function ProjectAdsDashboardPage() {
  const params = useParams();
  const slug = normalizeProjectSlug(params.slug as string);
  const monthId = params.monthId as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [demographics, setDemographics] = useState<DemographicRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [projectName, setProjectName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [weekdayChart, setWeekdayChart] = useState<WeekdayChartPoint[]>([]);
  const [previousMonth, setPreviousMonth] =
    useState<PreviousMonthComparison | null>(null);
  const [dailyTrend, setDailyTrend] = useState<{
    points: DailyTrendPoint[];
    promo: DailyTrendPromoConfig;
    daysInMonth: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !monthId) return;

    fetchProjectJson<{
      report: ReportData;
      keywords?: KeywordRow[];
      demographics?: DemographicRow[];
      devices?: DeviceRow[];
      project: { name: string };
      month?: { report_month?: string };
      weekdayChart?: WeekdayChartPoint[];
      previousMonth?: PreviousMonthComparison | null;
      dailyTrend?: {
        points: DailyTrendPoint[];
        promo: DailyTrendPromoConfig;
        daysInMonth: number;
      };
      isAdmin?: boolean;
    }>(apiProjectPath(slug, `months/${monthId}/dashboard`))
      .then((data) => {
        setReport(data.report);
        setKeywords(data.keywords || []);
        setDemographics(data.demographics || []);
        setDevices(data.devices || []);
        setProjectName(data.project.name);
        setReportMonth(data.month?.report_month || "");
        setIsAdmin(Boolean(data.isAdmin));
        setWeekdayChart(data.weekdayChart || []);
        setPreviousMonth(data.previousMonth ?? null);
        setDailyTrend(data.dailyTrend || null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "無法載入儀表板")
      )
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
      <div className="p-8 text-center text-[#d93025]">
        {error || "儀表板不存在"}
      </div>
    );
  }

  return (
    <ProjectAdsDashboard
      report={report}
      projectSlug={slug}
      monthId={monthId}
      projectName={projectName}
      reportMonth={reportMonth}
      keywords={keywords}
      demographics={demographics}
      devices={devices}
      isAdmin={isAdmin}
      weekdayChart={weekdayChart}
      dailyTrend={dailyTrend}
      previousMonth={previousMonth}
    />
  );
}
