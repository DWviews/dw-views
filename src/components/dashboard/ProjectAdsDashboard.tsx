"use client";

import { useMemo } from "react";
import type { ReportData } from "@/lib/report-engine";
import type { KeywordRow } from "@/lib/keyword-parser";
import { apiProjectPath, projectPagePath } from "@/lib/project-api";
import type { DemographicRow, DeviceRow } from "@/lib/csv-parser";
import type { WeekdayChartPoint } from "@/lib/daily-trend-shared";
import Link from "next/link";
import MonthlyTrendChart from "@/components/dashboard/MonthlyTrendChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Download,
  Lightbulb,
  Smartphone,
  MapPin,
  Users,
  BarChart3,
  Search,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";

const AGE_GROUPS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function parseMetricNumber(value: string): number {
  if (!value) return 0;
  if (/K/i.test(value)) {
    return Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * 1000);
  }
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function parsePercentMetric(value: string): number {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function deviceLabel(name: string): string {
  if (name.includes("Mobile")) return "Mobile phones";
  if (name.includes("Computer")) return "Computers";
  if (name.includes("Tablet")) return "Tablets";
  return name;
}

export default function ProjectAdsDashboard({
  report,
  projectSlug,
  monthId,
  projectName,
  keywords = [],
  demographics = [],
  devices = [],
  isAdmin = false,
  weekdayChart,
}: {
  report: ReportData;
  projectSlug: string;
  monthId: string;
  projectName: string;
  keywords?: KeywordRow[];
  demographics?: DemographicRow[];
  devices?: DeviceRow[];
  isAdmin?: boolean;
  weekdayChart?: WeekdayChartPoint[];
}) {
  const totalClicks = report.page2.metrics[0]?.value ?? "-";
  const totalImpressions = report.page2.metrics[1]?.value ?? "-";
  const totalCost = report.page2.metrics[4]?.value ?? "-";
  const totalConversions = report.page2.metrics[5]?.value ?? "-";

  const numericClicks = parseMetricNumber(String(totalClicks));
  const numericImpressions = parseMetricNumber(String(totalImpressions));
  const numericConversions = parseMetricNumber(String(totalConversions));
  const numericCost = parseMetricNumber(String(totalCost));
  const numericCtr = parsePercentMetric(String(report.page2.metrics[3]?.value ?? "0"));
  const numericConvRate = parsePercentMetric(String(report.page2.metrics[2]?.value ?? "0"));

  const dayChartData = (weekdayChart && weekdayChart.length > 0
    ? weekdayChart
    : report.page3.chartData.map((d) => ({
        day: d.day,
        impressions: d.impressions,
      }))
  ).map((d) => ({
    name: d.day,
    曝光: d.impressions,
  }));

  const weekdaySeed = useMemo(
    () =>
      weekdayChart && weekdayChart.length > 0
        ? weekdayChart
        : report.page3.chartData.map((d) => ({
            day: d.day,
            impressions: d.impressions,
          })),
    [weekdayChart, report.page3.chartData]
  );

  const deviceChartData = (
    devices.length > 0
      ? devices.filter((d) => d.device !== "TV screens").slice(0, 3)
      : report.page5.impressionData.slice(0, 3).map((d) => ({
          device: d.device,
          cost: 0,
          clicks: d.value,
          conversions: 0,
          impressions: d.value,
        }))
  ).map((d, index) => ({
    name: deviceLabel(d.device),
    cost: d.cost,
    clicks: d.clicks,
    conversions: d.conversions,
    color: ["#4285f4", "#db4437", "#fbbc04"][index] || "#4285f4",
  }));

  const deviceTotals = {
    cost: deviceChartData.reduce((s, d) => s + d.cost, 0) || 1,
    clicks: deviceChartData.reduce((s, d) => s + d.clicks, 0) || 1,
    conversions:
      deviceChartData.reduce((s, d) => s + d.conversions, 0) || 1,
  };

  const locationData = report.page6.chartData.map((d) => ({
    location: d.location,
    impressions: d.impressions,
    percent: d.percent,
  }));

  const competitorData = report.page7.chartData.map((d, index) => ({
    name: d.name,
    share: d.share,
    color: ["#4285f4", "#db4437", "#fbbc04", "#34a853"][index] || d.color,
  }));

  const ageHeatmap = AGE_GROUPS.map((age) => {
    const male = demographics
      .filter((d) => d.gender === "Male" && d.ageRange === age)
      .reduce((sum, d) => sum + d.impressions, 0);
    const female = demographics
      .filter((d) => d.gender === "Female" && d.ageRange === age)
      .reduce((sum, d) => sum + d.impressions, 0);
    return { label: age, male, female };
  });

  const heatmapMax = Math.max(
    ...ageHeatmap.flatMap((item) => [item.male, item.female]),
    1
  );

  const topKeywords = keywords.slice(0, 5);

  const topInsightCards = [
    report.page2.insights[0],
    report.page5.insights[0]?.desc,
    report.page6.insights[0]?.desc,
    report.page7.insights[0]?.desc,
  ].filter(Boolean);

  const widgetClass =
    "bg-white border border-[#dadce0] rounded-xl shadow-[0_1px_2px_rgba(60,64,67,0.08)]";

  const costPerConversion = `$${Math.round(numericCost / Math.max(numericConversions, 1))}`;

  return (
    <div className="min-h-full bg-[#f1f3f4]">
      <div className="bg-[#f8f9fa] border-b border-[#dadce0]">
        <div className="max-w-[1500px] mx-auto px-6 pt-3 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href={projectPagePath(projectSlug, String(monthId))}
                  className="inline-flex items-center gap-1 text-sm text-[#5f6368] hover:text-[#1a73e8]"
                >
                  <ArrowLeft size={14} />
                  返回報告
                </Link>
                <span className="text-[#dadce0]">|</span>
                <span className="text-sm text-[#202124] font-medium">首頁</span>
              </div>
              <h1 className="text-xl font-medium text-[#202124]">
                {projectName} Google Ads Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#5f6368]">
              <div className="flex items-center gap-1 border border-[#dadce0] bg-white px-3 py-2 rounded">
                <span>自訂</span>
                <span className="text-[#202124]">{report.project.dateRange}</span>
                <ChevronDown size={14} />
              </div>
              <button className="p-2 hover:bg-white rounded-full">
                <ChevronLeft size={16} />
              </button>
              <button className="p-2 hover:bg-white rounded-full">
                <ChevronRight size={16} />
              </button>
              <a
                href={apiProjectPath(projectSlug, `pdf?monthId=${monthId}`)}
                className="inline-flex items-center gap-2 border border-[#dadce0] bg-white text-[#202124] px-4 py-2 rounded text-sm hover:bg-[#f8f9fa]"
              >
                <Download size={14} />
                匯出 PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto p-6">
        <div className={`${widgetClass} mb-5 overflow-hidden`}>
          <div className="flex border-b border-[#dadce0]">
            <div className="flex-1 bg-[#4285f4] text-white px-5 py-4">
              <div className="text-xs mb-1 flex items-center gap-1">
                點擊 <ChevronDown size={12} />
              </div>
              <div className="text-4xl font-normal">{totalClicks}</div>
            </div>
            <div className="flex-1 bg-[#db4437] text-white px-5 py-4">
              <div className="text-xs mb-1 flex items-center gap-1">
                轉換 <ChevronDown size={12} />
              </div>
              <div className="text-4xl font-normal">{totalConversions}</div>
            </div>
            <div className="flex-1 bg-white px-5 py-4 border-l border-[#dadce0]">
              <div className="text-xs text-[#5f6368] mb-1">單次轉換費用</div>
              <div className="text-4xl font-normal text-[#202124]">
                {costPerConversion}
              </div>
            </div>
            <div className="flex-1 bg-white px-5 py-4 border-l border-[#dadce0] flex justify-between">
              <div>
                <div className="text-xs text-[#5f6368] mb-1">費用</div>
                <div className="text-4xl font-normal text-[#202124]">
                  {totalCost}
                </div>
              </div>
              <MoreVertical size={16} className="text-[#5f6368]" />
            </div>
          </div>
          <MonthlyTrendChart
            projectSlug={projectSlug}
            monthId={monthId}
            totalClicks={numericClicks}
            totalConversions={numericConversions}
            totalImpressions={numericImpressions}
            ctr={numericCtr}
            convRate={numericConvRate}
            reportMonth={report.project.reportMonth}
            isAdmin={isAdmin}
            weekdaySeed={weekdaySeed}
          />
        </div>

        <div className={`${widgetClass} mb-5 p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#202124]">
              <Search size={16} className="text-[#5f6368]" />
              帳戶診斷
            </div>
            <MoreVertical size={16} className="text-[#5f6368]" />
          </div>
          <p className="text-sm text-[#5f6368] mb-4">
            您有幾個近期廣告活動需要處理
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {topInsightCards.map((item, index) => (
              <div
                key={index}
                className="border border-[#dadce0] rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded bg-[#e8f0fe] flex items-center justify-center">
                    <BarChart3 size={16} className="text-[#1a73e8]" />
                  </div>
                </div>
                <div className="text-sm font-medium text-[#202124] mb-2">
                  診斷項目 {index + 1}
                </div>
                <div className="text-xs text-[#5f6368] leading-5 mb-3">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">建議</h2>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm text-[#202124] leading-6 mb-3">
                  {report.page2.opportunity}
                </div>
              </div>
            </div>

            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">
                    星期幾和時段
                  </h2>
                </div>
                <span className="text-xs text-[#5f6368]">曝光</span>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dayChartData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#5f6368" }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#5f6368" }} />
                    <Tooltip />
                    <Bar
                      dataKey="曝光"
                      fill="#8ab4f8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">廣告活動</h2>
                </div>
                <MoreVertical size={16} className="text-[#5f6368]" />
              </div>
              <div className="p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#5f6368] border-b border-[#f1f3f4]">
                      <th className="text-left font-normal pb-2">
                        廣告活動成效摘要
                      </th>
                      <th className="text-right font-normal pb-2">費用</th>
                      <th className="text-right font-normal pb-2">轉換</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 text-[#1a73e8] font-medium">
                        {projectName}
                      </td>
                      <td className="py-3 text-right">{totalCost}</td>
                      <td className="py-3 text-right">{totalConversions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">
                    客層性別年齡分布
                  </h2>
                </div>
                <span className="text-xs text-[#5f6368]">曝光</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-6 gap-1 text-[10px] text-[#5f6368] mb-2">
                  {ageHeatmap.map((item) => (
                    <div key={item.label} className="text-center">
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-xs text-[#5f6368]">男性</span>
                    <div className="grid grid-cols-6 gap-1 flex-1">
                      {ageHeatmap.map((item) => (
                        <div
                          key={`${item.label}-m`}
                          className="h-10 rounded"
                          title={`${item.male.toLocaleString()} 曝光`}
                          style={{
                            background: `rgba(66,133,244,${Math.max(
                              0.12,
                              item.male / heatmapMax
                            )})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-xs text-[#5f6368]">女性</span>
                    <div className="grid grid-cols-6 gap-1 flex-1">
                      {ageHeatmap.map((item) => (
                        <div
                          key={`${item.label}-f`}
                          className="h-10 rounded"
                          title={`${item.female.toLocaleString()} 曝光`}
                          style={{
                            background: `rgba(66,133,244,${Math.max(
                              0.12,
                              item.female / heatmapMax
                            )})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">關鍵字</h2>
                </div>
                <Link
                  href={projectPagePath(projectSlug, `${monthId}/keywords`)}
                  className="text-xs text-[#1a73e8] hover:underline"
                >
                  詳細列表
                </Link>
              </div>
              <div className="p-4">
                {topKeywords.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#5f6368] border-b border-[#f1f3f4]">
                        <th className="text-left font-normal pb-2">關鍵字</th>
                        <th className="text-right font-normal pb-2">曝光</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topKeywords.map((row) => (
                        <tr key={row.keyword} className="border-b border-[#f8f9fa]">
                          <td className="py-2 text-[#1a73e8]">{row.keyword}</td>
                          <td className="py-2 text-right">
                            {row.impressions.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-[#5f6368]">
                    尚無關鍵字資料，請於專案管理上傳每月關鍵字報告（CSV 或 Excel）
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">裝置</h2>
                </div>
                <MoreVertical size={16} className="text-[#5f6368]" />
              </div>
              <div className="p-4">
                <div className="flex gap-3 mb-4 text-[11px] text-[#5f6368] flex-wrap">
                  {deviceChartData.map((item, index) => (
                    <span key={item.name} className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          background:
                            ["#4285f4", "#db4437", "#fbbc04"][index] || "#4285f4",
                        }}
                      />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="space-y-4">
                  {(
                    [
                      ["費用", "cost", deviceTotals.cost],
                      ["點擊", "clicks", deviceTotals.clicks],
                      ["轉換", "conversions", deviceTotals.conversions],
                    ] as const
                  ).map(([label, key, total]) => (
                    <div key={label}>
                      <div className="text-xs text-[#5f6368] mb-1">{label}</div>
                      <div className="h-4 rounded-full overflow-hidden flex bg-[#f1f3f4]">
                        {deviceChartData.map((item, index) => (
                          <div
                            key={`${label}-${item.name}`}
                            title={`${item.name}: ${item[key].toLocaleString()}`}
                            style={{
                              width: `${(item[key] / total) * 100}%`,
                              background:
                                ["#4285f4", "#db4437", "#fbbc04"][index] ||
                                "#4285f4",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">地區</h2>
                </div>
                <Monitor size={16} className="text-[#5f6368]" />
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={locationData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#5f6368" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="location"
                      width={90}
                      tick={{ fontSize: 10, fill: "#5f6368" }}
                    />
                    <Tooltip
                      formatter={(
                        value: number,
                        _name,
                        props: { payload?: { percent?: number } }
                      ) => [
                        `${value.toLocaleString()} (${props.payload?.percent ?? 0}%)`,
                        "曝光",
                      ]}
                    />
                    <Bar
                      dataKey="impressions"
                      fill="#8ab4f8"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={widgetClass}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#5f6368]" />
                  <h2 className="text-sm font-medium text-[#202124]">競價分析</h2>
                </div>
                <MoreVertical size={16} className="text-[#5f6368]" />
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {competitorData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: item.color }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-[#5f6368] mb-1">
                          <span className="truncate max-w-[160px]">{item.name}</span>
                          <span>{item.share.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#f1f3f4] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(item.share, 100)}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
