"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ReportData } from "@/lib/report-engine";
import { apiProjectPath } from "@/lib/project-api";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

const PAGE_MAP = [
  { page: "P1", title: "封面頁" },
  { page: "P2", title: "活動績效數據" },
  { page: "P3", title: "每日曝光趨勢" },
  { page: "P4", title: "人口統計分析" },
  { page: "P5", title: "設備性能比較" },
  { page: "P6", title: "地理分布分析" },
  { page: "P7", title: "競爭對手分析" },
  { page: "P8", title: "優化建議" },
  { page: "P9", title: "方法論與路線圖" },
];

const COLORS = {
  dark: "#12377A",
  mid: "#3D8BC1",
  light: "#6BAFD3",
  pale: "#A8D5E5",
  bg: "#F2F9FC",
  gray: "#858481",
  text: "#333333",
};

function SlideWrapper({
  children,
  pageNum,
  total,
}: {
  children: React.ReactNode;
  pageNum: number;
  total: number;
}) {
  return (
    <div
      className="w-full min-h-[70vh] md:min-h-0 md:aspect-[16/9] bg-[#F2F9FC] rounded-lg overflow-auto md:overflow-hidden shadow-lg relative"
      style={{ maxWidth: 1280 }}
    >
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#12377A] via-[#3D8BC1] to-[#6BAFD3]" />
      {children}
      <div className="absolute bottom-3 right-5 text-xs text-[#858481]">
        {pageNum} / {total}
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 mb-2 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-[#12377A]">{title}</div>
          <div className="text-xs text-[#858481] mt-0.5 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function GradientBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 text-white mt-3"
      style={{ background: "linear-gradient(135deg, #12377A 0%, #3D8BC1 100%)" }}
    >
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-xs leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

function Page1({ data }: { data: ReportData["page1"] }) {
  return (
    <SlideWrapper pageNum={1} total={9}>
      <div className="flex flex-col items-center justify-center h-full px-4 sm:px-10 relative py-10 md:py-0">
        <div className="absolute top-[15%] right-[20%] w-[120px] h-[120px] rounded-full bg-[#6BAFD3] opacity-10" />
        <div className="absolute top-[60%] right-[15%] w-[80px] h-[80px] rounded-full bg-[#3D8BC1] opacity-10" />
        <div className="absolute top-[35%] right-[35%] w-[60px] h-[60px] rounded-full bg-[#12377A] opacity-8" />
        <div className="absolute bottom-8 right-10 text-[180px] font-extrabold text-[#12377A] opacity-[0.08] leading-none select-none">
          2026
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#12377A] text-center leading-tight tracking-tight whitespace-pre-line">
          {data.title}
        </h1>
        <p className="text-base sm:text-xl text-[#3D8BC1] font-light mt-4 text-center">{data.subtitle}</p>
        <p className="text-base text-[#858481] mt-6">{data.date}</p>
        <p className="absolute bottom-6 left-10 text-xs text-[#858481]">
          Marketing Report provided by Diamond Wise Company ©2026
        </p>
      </div>
    </SlideWrapper>
  );
}

function Page2({ data }: { data: ReportData["page2"] }) {
  return (
    <SlideWrapper pageNum={2} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-4 sm:mb-5">Campaign Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:h-[calc(100%-60px)]">
          <div className="grid grid-cols-2 gap-3 content-start">
            {data.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg p-4"
                style={{ background: "rgba(18, 55, 122, 0.05)" }}
              >
                <div className="text-xs text-[#858481] mb-1">{m.label}</div>
                <div className="text-2xl sm:text-3xl font-bold text-[#12377A]">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-[#12377A] mb-3">Key Insights</h3>
            {data.insights.map((ins, i) => (
              <p key={i} className="text-xs text-[#333] mb-2 leading-relaxed pl-3 border-l-2 border-[#6BAFD3]">
                {ins}
              </p>
            ))}
            <GradientBox title="Key Opportunity">{data.opportunity}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page3({ data }: { data: ReportData["page3"] }) {
  return (
    <SlideWrapper pageNum={3} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Day of Week Performance</h2>
        <p className="text-sm text-[#858481] mb-4">Weekly impression trends and engagement patterns</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:h-[calc(100%-80px)]">
          <div className="md:col-span-3 min-w-0">
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data.chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#12377A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#858481" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="impressions" radius={[4, 4, 0, 0]}>
                  {data.chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-2 flex flex-col min-w-0">
            {data.insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
            <GradientBox title="Optimization Recommendation">{data.recommendation}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page4({ data }: { data: ReportData["page4"] }) {
  return (
    <SlideWrapper pageNum={4} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Demographics Analysis</h2>
        <p className="text-sm text-[#858481] mb-4">Audience breakdown by age group and gender</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:h-[calc(100%-80px)]">
          <div className="md:col-span-3 space-y-3 min-w-0">
            <div className="h-[55%]">
              <div className="text-xs text-[#858481] mb-1">Age Distribution (Impressions)</div>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data.ageData}>
                  <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#12377A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#858481" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.ageData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[40%]">
              <div className="text-xs text-[#858481] mb-1">Gender Distribution</div>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={data.genderData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                  >
                    <Cell fill={COLORS.dark} />
                    <Cell fill={COLORS.light} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col min-w-0">
            {data.insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
            <GradientBox title="Targeting Recommendation">{data.recommendation}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page5({ data }: { data: ReportData["page5"] }) {
  return (
    <SlideWrapper pageNum={5} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Device Performance</h2>
        <p className="text-sm text-[#858481] mb-4">Impression volume and conversion efficiency by device</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:h-[calc(100%-80px)]">
          <div className="md:col-span-3 space-y-4 min-w-0">
            <div>
              <div className="text-xs text-[#858481] mb-1">Device Impressions Volume</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.impressionData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="device" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.impressionData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-xs text-[#858481] mb-1">Conversion Rate by Device</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.convRateData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="device" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.convRateData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col min-w-0">
            {data.insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
            <GradientBox title="Device Optimization Strategy">{data.strategy}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page6({ data }: { data: ReportData["page6"] }) {
  return (
    <SlideWrapper pageNum={6} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Geographic Distribution</h2>
        <p className="text-sm text-[#858481] mb-4">Impression volume across Hong Kong regions</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:h-[calc(100%-80px)]">
          <div className="md:col-span-3 min-w-0">
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={data.chartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="location" type="category" width={110} tick={{ fontSize: 11, fill: "#12377A" }} />
                <Tooltip formatter={(v: number, _: string, props: { payload?: { percent: number } }) => [`${v.toLocaleString()} (${props.payload?.percent}%)`, "Impressions"]} />
                <Bar dataKey="impressions" radius={[0, 4, 4, 0]} label={{ position: "insideRight", fontSize: 10, fill: "#fff", formatter: (v: number) => v.toLocaleString() }}>
                  {data.chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-2 flex flex-col min-w-0">
            {data.insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
            <GradientBox title="Geographic Targeting Recommendation">{data.recommendation}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page7({ data }: { data: ReportData["page7"] }) {
  return (
    <SlideWrapper pageNum={7} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Competitive Analysis</h2>
        <p className="text-sm text-[#858481] mb-4">Market share and visibility benchmarking</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:h-[calc(100%-80px)]">
          <div className="md:col-span-3 min-w-0">
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={data.chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#12377A" }} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, "Impression Share"]} />
                <Bar dataKey="share" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, formatter: (v: number) => `${v}%` }}>
                  {data.chartData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-2 flex flex-col min-w-0">
            {data.insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
            <GradientBox title="Competitive Strategy">{data.strategy}</GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page8({ data }: { data: ReportData["page8"] }) {
  return (
    <SlideWrapper pageNum={8} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Optimization Opportunities</h2>
        <p className="text-sm text-[#858481] mb-4">Strategic Recommendations for Performance Enhancement</p>
        <div className="space-y-3">
          {data.optimizations.map((opt) => (
            <div key={opt.num} className="bg-white rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: "linear-gradient(135deg, #12377A, #3D8BC1)" }}
              >
                {opt.num}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#12377A]">{opt.title}</div>
                <div className="text-xs text-[#858481] mt-1 leading-relaxed">{opt.desc}</div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xs text-[#3D8BC1] font-medium">{opt.impact}</div>
                <div className="text-[10px] text-[#858481] mt-1">{opt.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  );
}

function Page9({ data, projectName }: { data: ReportData["page9"]; projectName: string }) {
  return (
    <SlideWrapper pageNum={9} total={9}>
      <div className="p-4 sm:p-6 md:p-8 h-full min-h-[inherit]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#12377A] mb-1">Methodology and Roadmap</h2>
        <p className="text-sm text-[#858481] mb-4">Data sources, analysis methodology, and implementation plan</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:h-[calc(100%-80px)]">
          <div>
            <h3 className="text-sm font-semibold text-[#12377A] mb-3">Data Sources & Methodology</h3>
            {data.methodology.map((m, i) => (
              <div key={i} className="rounded-lg p-3 mb-2" style={{ background: "rgba(18,55,122,0.05)" }}>
                <div className="flex items-start gap-2">
                  <span>{m.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-[#12377A]">{m.title}</div>
                    <div className="text-[10px] text-[#858481] mt-0.5">{m.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#12377A] mb-3">Implementation Roadmap</h3>
            {data.roadmap.map((r, i) => (
              <div key={i} className="rounded-lg p-3 mb-2" style={{ background: "rgba(18,55,122,0.05)" }}>
                <div className="text-xs font-semibold text-[#12377A]">📅 {r.week}</div>
                <div className="text-[10px] text-[#858481] mt-0.5">{r.task}</div>
              </div>
            ))}
            <GradientBox title="Diamond Wise Company | Dave">
              Email: sales@diamondwisecpy.com
              <br />
              For questions or implementation support, please contact us.
            </GradientBox>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

export default function ReportViewer({
  report,
  projectName,
  projectSlug,
  monthId,
  reportMonth,
}: {
  report: ReportData;
  projectName: string;
  projectSlug: string;
  monthId: string;
  reportMonth?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    try {
      setExporting(true);
      const response = await fetch(
        apiProjectPath(projectSlug, `pdf?monthId=${monthId}`),
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "PDF 匯出失敗");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName}-${reportMonth || "monthly"}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF 匯出失敗";
      window.alert(message);
    } finally {
      setExporting(false);
    }
  }

  const pages = [
    <Page1 key={0} data={report.page1} />,
    <Page2 key={1} data={report.page2} />,
    <Page3 key={2} data={report.page3} />,
    <Page4 key={3} data={report.page4} />,
    <Page5 key={4} data={report.page5} />,
    <Page6 key={5} data={report.page6} />,
    <Page7 key={6} data={report.page7} />,
    <Page8 key={7} data={report.page8} />,
    <Page9 key={8} data={report.page9} projectName={projectName} />,
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-0 sm:px-0">
      <div className="mb-4 rounded-lg border border-[#dadce0] bg-white p-3 sm:p-4">
        <h2 className="text-sm font-semibold text-[#12377A] mb-3">
          頁數對應內容
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {PAGE_MAP.map((item, index) => (
            <button
              key={item.page}
              onClick={() => setCurrent(index)}
              className={`rounded border px-3 py-2.5 text-left transition-colors min-h-11 ${
                current === index
                  ? "border-[#12377A] bg-[#e8f0fe] text-[#12377A]"
                  : "border-[#dadce0] bg-[#F2F9FC] text-[#858481] hover:border-[#3D8BC1]"
              }`}
            >
              <div className="font-medium">{item.page}</div>
              <div>{item.title}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[#12377A] break-words">
            {projectName} 月度報告
            {reportMonth ? ` · ${reportMonth}` : ""}
          </h1>
          <p className="text-sm text-[#858481]">{report.project.dateRange}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full hover:bg-white disabled:opacity-30 border border-[#dadce0]"
            aria-label="上一頁"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-[#858481] w-16 text-center">
            {current + 1} / 9
          </span>
          <button
            onClick={() => setCurrent(Math.min(8, current + 1))}
            disabled={current === 8}
            className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full hover:bg-white disabled:opacity-30 border border-[#dadce0]"
            aria-label="下一頁"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center justify-center gap-1 text-sm text-[#12377A] border border-[#12377A] px-3 py-2 rounded hover:bg-[#e8f0fe] disabled:opacity-50 min-h-11"
          >
            <Download size={14} />
            {exporting ? "匯出中..." : "匯出 PDF"}
          </button>
        </div>
      </div>

      {pages[current]}

      <div className="flex justify-center gap-2 mt-4 pb-2">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === current ? "bg-[#12377A]" : "bg-[#A8D5E5]"
            }`}
            aria-label={`第 ${i + 1} 頁`}
          />
        ))}
      </div>
    </div>
  );
}
