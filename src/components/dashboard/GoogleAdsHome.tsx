"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  HelpCircle,
  Download,
  MessageSquare,
  Lightbulb,
  Clock,
  Search,
  BarChart2,
  Users,
  Key,
  Smartphone,
  TrendingDown,
  MoreVertical,
  Search as SearchIcon,
} from "lucide-react";
import WidgetCard from "./WidgetCard";

interface DashboardData {
  totals: {
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_cost: number;
    campaign_count: number;
    avg_ctr: string;
    avg_cpc: string;
  };
  dailyMetrics: {
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
  }[];
  topCampaigns: {
    campaign_name: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    status: string;
  }[];
}

const DAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const HOURS = ["上午12時", "上午3時", "上午6時", "上午9時", "下午12時", "下午3時", "下午6時", "下午9時"];

const SEARCH_TERMS = [
  "nmn", "維特健靈", "nmn 功效", "nmn 推薦", "nad", "nmn 價錢",
  "nmn 香港", "nmn 副作用", "nmn 好處", "nmn 品牌", "nmn 減肥",
  "nmn 抗衰老", "nmn 保健品", "nmn 補充劑", "nmn 研究",
];

const KEYWORDS = [
  { name: "維特健靈", cost: 1200, clicks: 89, conv: 12 },
  { name: "nad", cost: 980, clicks: 76, conv: 8 },
  { name: "NMN", cost: 850, clicks: 65, conv: 10 },
  { name: "nmn 功效", cost: 720, clicks: 54, conv: 6 },
  { name: "nmn 推薦", cost: 650, clicks: 48, conv: 5 },
];

const COMPETITORS = [
  { name: "您", x: 45, y: 62, z: 200 },
  { name: "vitagreen.com", x: 38, y: 55, z: 150 },
  { name: "thelifehub.com", x: 52, y: 48, z: 120 },
  { name: "iherb.com", x: 65, y: 42, z: 180 },
  { name: "gnc.com.hk", x: 30, y: 70, z: 100 },
];

function formatCurrency(n: number) {
  return "HK$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function generateHeatmap() {
  const data: { day: number; hour: number; value: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 8; h++) {
      data.push({ day: d, hour: h, value: Math.random() });
    }
  }
  return data;
}

export default function GoogleAdsHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeMetric, setActiveMetric] = useState<"clicks" | "conversions">("clicks");
  const [heatmap] = useState(generateHeatmap);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { totals, dailyMetrics, topCampaigns } = data;
  const costPerConv = totals.total_conversions > 0
    ? Math.round(totals.total_cost / totals.total_conversions)
    : 0;

  const chartData = dailyMetrics.slice(-7).map((d) => ({
    date: new Date(d.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
    點擊: d.clicks,
    轉換: Math.round(d.conversions * 10),
  }));

  const pausedCampaigns = topCampaigns.filter((c) => c.status === "Paused");
  const diagnosisCampaigns = pausedCampaigns.length > 0
    ? pausedCampaigns
    : topCampaigns.slice(0, 4).map((c) => ({ ...c, status: "Paused" }));

  const deviceData = [
    { metric: "費用", mobile: 65, tablet: 10, desktop: 25 },
    { metric: "點擊", mobile: 70, tablet: 8, desktop: 22 },
    { metric: "轉換", mobile: 55, tablet: 12, desktop: 33 },
  ];

  return (
    <div className="bg-[#f1f3f4] min-h-full">
      {/* Page header bar */}
      <div className="bg-white border-b border-[#dadce0] px-6 pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-[#1a73e8] border-b-2 border-[#1a73e8] pb-2 px-1">
              首頁
            </button>
            <button className="text-sm text-[#5f6368] hover:text-[#202124] flex items-center gap-1 pb-2">
              <Plus size={14} />
              新增自訂檢視畫面
            </button>
            <button className="p-1 hover:bg-[#f1f3f4] rounded-full pb-2">
              <HelpCircle size={18} className="text-[#5f6368]" />
            </button>
          </div>
          <div className="flex items-center gap-3 pb-2">
            <div className="flex items-center gap-1 text-sm text-[#202124]">
              <button className="p-1 hover:bg-[#f1f3f4] rounded-full">
                <ChevronLeft size={18} />
              </button>
              <span className="px-2">自訂 2026年7月1日 – 7日</span>
              <button className="p-1 hover:bg-[#f1f3f4] rounded-full">
                <ChevronRight size={18} />
              </button>
              <ChevronDown size={16} className="text-[#5f6368]" />
            </div>
            <button className="p-2 hover:bg-[#f1f3f4] rounded-full" title="下載">
              <Download size={18} className="text-[#5f6368]" />
            </button>
            <button className="p-2 hover:bg-[#f1f3f4] rounded-full" title="意見">
              <MessageSquare size={18} className="text-[#5f6368]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 max-w-[1600px] mx-auto">
        {/* Add campaign button */}
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 bg-[#1a73e8] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#1557b0] shadow-sm mb-4 transition-colors"
        >
          <Plus size={18} />
          新增廣告活動
        </Link>

        {/* Main performance card */}
        <div className="bg-white border border-[#dadce0] rounded-lg mb-4 overflow-hidden">
          <div className="flex items-stretch border-b border-[#dadce0]">
            {/* Metric pills */}
            <button
              onClick={() => setActiveMetric("clicks")}
              className={`flex-1 px-5 py-4 text-left transition-colors ${
                activeMetric === "clicks"
                  ? "bg-[#1a73e8] text-white"
                  : "bg-white hover:bg-[#f8f9fa]"
              }`}
            >
              <div className={`text-xs mb-1 flex items-center gap-1 ${activeMetric === "clicks" ? "text-blue-100" : "text-[#5f6368]"}`}>
                點擊 <ChevronDown size={12} />
              </div>
              <div className="text-2xl font-normal">{totals.total_clicks.toLocaleString()}</div>
            </button>
            <button
              onClick={() => setActiveMetric("conversions")}
              className={`flex-1 px-5 py-4 text-left border-l border-[#dadce0] transition-colors ${
                activeMetric === "conversions"
                  ? "bg-[#c5221f] text-white"
                  : "bg-white hover:bg-[#f8f9fa]"
              }`}
            >
              <div className={`text-xs mb-1 flex items-center gap-1 ${activeMetric === "conversions" ? "text-red-100" : "text-[#5f6368]"}`}>
                新網站數據 (Purchase) <ChevronDown size={12} />
              </div>
              <div className="text-2xl font-normal">{Math.round(totals.total_conversions * 10).toLocaleString()}</div>
            </button>
            <div className="flex-1 px-5 py-4 border-l border-[#dadce0]">
              <div className="text-xs text-[#5f6368] mb-1">單次轉換費用</div>
              <div className="text-2xl font-normal text-[#202124]">${costPerConv}</div>
            </div>
            <div className="flex-1 px-5 py-4 border-l border-[#dadce0] flex items-start justify-between">
              <div>
                <div className="text-xs text-[#5f6368] mb-1">費用</div>
                <div className="text-2xl font-normal text-[#202124]">
                  ${totals.total_cost.toLocaleString()}
                </div>
              </div>
              <button className="p-1 hover:bg-[#f1f3f4] rounded-full mt-1">
                <MoreVertical size={16} className="text-[#5f6368]" />
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="p-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#5f6368" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#5f6368" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#5f6368" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #dadce0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="點擊"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="轉換"
                  stroke="#c5221f"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account diagnosis */}
        <div className="bg-white border border-[#dadce0] rounded-lg mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-2">
              <SearchIcon size={18} className="text-[#5f6368]" />
              <h3 className="text-sm font-medium text-[#202124]">帳戶診斷</h3>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-[#f1f3f4] rounded-full">
                <MoreVertical size={16} className="text-[#5f6368]" />
              </button>
              <button className="p-1 hover:bg-[#f1f3f4] rounded-full">
                <ChevronDown size={16} className="text-[#5f6368]" />
              </button>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-[#5f6368] mb-3">您有幾個近期廣告活動需要處理</p>
            <div className="relative">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              >
                {diagnosisCampaigns.map((c) => (
                  <div
                    key={c.campaign_name}
                    className="shrink-0 w-52 border border-[#dadce0] rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 bg-[#e8f0fe] rounded flex items-center justify-center">
                        <BarChart2 size={16} className="text-[#1a73e8]" />
                      </div>
                      <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded">
                        已暫停
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[#202124] mb-1 truncate">
                      {c.campaign_name}
                    </div>
                    <div className="text-xs text-[#5f6368] mb-3">廣告活動已暫停</div>
                    <button className="text-sm text-[#1a73e8] hover:underline">
                      查看詳情
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-[#dadce0] rounded-full shadow flex items-center justify-center hover:bg-[#f8f9fa]"
              >
                <ChevronRight size={16} className="text-[#5f6368]" />
              </button>
            </div>
          </div>
        </div>

        {/* Widget grid - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Recommendations */}
            <WidgetCard
              title="建議"
              icon={<Lightbulb size={16} />}
              headerRight={
                <span className="text-xs text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded">
                  +9.8% 核心預算
                </span>
              }
            >
              <p className="text-sm text-[#202124] mb-3">
                您的廣告活動因預算限制而損失曝光。提高預算可獲得更多流量。
              </p>
              <div className="flex gap-2">
                <button className="gads-btn-primary text-sm px-4 py-1.5">套用</button>
                <button className="text-sm text-[#1a73e8] hover:underline px-2">檢視</button>
              </div>
            </WidgetCard>

            {/* Day & Time heatmap */}
            <WidgetCard
              title="星期幾和時段"
              icon={<Clock size={16} />}
              headerRight={
                <select className="text-xs border border-[#dadce0] rounded px-2 py-0.5">
                  <option>曝光</option>
                  <option>點擊</option>
                </select>
              }
              footer={
                <>
                  <div className="flex gap-2">
                    {["天", "星期幾和時段", "時段"].map((t, i) => (
                      <button
                        key={t}
                        className={`px-2 py-0.5 rounded ${i === 1 ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-[#5f6368]"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <a href="#" className="text-[#1a73e8] hover:underline">廣告時段</a>
                </>
              }
            >
              <div className="overflow-x-auto">
                <div className="min-w-[320px]">
                  <div className="flex mb-1">
                    <div className="w-10" />
                    {HOURS.map((h) => (
                      <div key={h} className="flex-1 text-[9px] text-[#5f6368] text-center truncate px-0.5">
                        {h}
                      </div>
                    ))}
                  </div>
                  {DAYS.map((day, di) => (
                    <div key={day} className="flex items-center mb-0.5">
                      <div className="w-10 text-[10px] text-[#5f6368] truncate">{day}</div>
                      {HOURS.map((_, hi) => {
                        const cell = heatmap.find((c) => c.day === di && c.hour === hi);
                        const v = cell?.value ?? 0;
                        const opacity = 0.1 + v * 0.9;
                        return (
                          <div
                            key={hi}
                            className="flex-1 h-5 mx-px rounded-sm"
                            style={{ backgroundColor: `rgba(26, 115, 232, ${opacity})` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </WidgetCard>

            {/* Search terms */}
            <WidgetCard
              title="搜尋字詞"
              icon={<Search size={16} />}
              headerRight={
                <span className="text-xs text-[#5f6368]">排序方式：曝光</span>
              }
              footer={
                <>
                  <div className="flex items-center gap-2 text-[#5f6368]">
                    <button className="hover:text-[#202124]">&lt;</button>
                    <span>1 / 5</span>
                    <button className="hover:text-[#202124]">&gt;</button>
                  </div>
                  <a href="#" className="text-[#1a73e8] hover:underline">所有搜尋字詞</a>
                </>
              }
            >
              <div className="flex flex-wrap gap-2">
                {SEARCH_TERMS.map((term, i) => (
                  <span
                    key={term}
                    className="inline-block px-3 py-1.5 bg-[#f8f9fa] border border-[#dadce0] rounded-full text-xs text-[#202124]"
                    style={{ fontSize: `${10 + (i % 5) * 2}px` }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </WidgetCard>
          </div>

          {/* CENTER COLUMN */}
          <div className="space-y-4">
            {/* Campaigns table */}
            <WidgetCard
              title="廣告活動"
              icon={<BarChart2 size={16} />}
              footer={
                <>
                  <div className="flex items-center gap-2 text-[#5f6368]">
                    <button>&lt;</button><span>1 / 1</span><button>&gt;</button>
                  </div>
                  <Link href="/dashboard/campaigns" className="text-[#1a73e8] hover:underline">
                    所有廣告活動
                  </Link>
                </>
              }
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#5f6368]">
                    <th className="text-left pb-2 font-normal">廣告活動</th>
                    <th className="text-right pb-2 font-normal">費用</th>
                    <th className="text-right pb-2 font-normal">轉換</th>
                    <th className="text-right pb-2 font-normal bg-[#e8f0fe] px-2 rounded">購買/銷售</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.slice(0, 3).map((c) => (
                    <tr key={c.campaign_name} className="border-t border-[#f1f3f4]">
                      <td className="py-2 text-[#1a73e8] truncate max-w-[120px]">{c.campaign_name}</td>
                      <td className="py-2 text-right">{formatCurrency(c.cost)}</td>
                      <td className="py-2 text-right">{c.conversions}</td>
                      <td className="py-2 text-right bg-[#e8f0fe] px-2">{(c.conversions * 0.1).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WidgetCard>

            {/* Demographics */}
            <WidgetCard
              title="客層"
              icon={<Users size={16} />}
              headerRight={
                <select className="text-xs border border-[#dadce0] rounded px-2 py-0.5">
                  <option>曝光</option>
                </select>
              }
              footer={<a href="#" className="text-[#1a73e8] hover:underline ml-auto">客層</a>}
            >
              <div className="space-y-1">
                {["18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((age) => (
                  <div key={age} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#5f6368] w-10">{age}</span>
                    <div className="flex-1 flex gap-1 h-4">
                      <div
                        className="bg-[#1a73e8] rounded-sm"
                        style={{ width: `${20 + Math.random() * 40}%` }}
                      />
                      <div
                        className="bg-[#ea4335] rounded-sm"
                        style={{ width: `${15 + Math.random() * 35}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 mt-2 text-[10px] text-[#5f6368]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#1a73e8] rounded-full" /> 男性
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#ea4335] rounded-full" /> 女性
                  </span>
                </div>
              </div>
            </WidgetCard>

            {/* Keywords */}
            <WidgetCard
              title="關鍵字"
              icon={<Key size={16} />}
              headerRight={
                <button className="text-xs text-[#1a73e8] flex items-center gap-0.5">
                  <Plus size={12} /> 新增關鍵字
                </button>
              }
              footer={
                <>
                  <div className="flex items-center gap-2 text-[#5f6368]">
                    <button>&lt;</button><span>1 / 10</span><button>&gt;</button>
                  </div>
                  <div className="flex gap-3">
                    <a href="#" className="text-[#1a73e8] hover:underline">關鍵字</a>
                    <a href="#" className="text-[#1a73e8] hover:underline">否定關鍵字</a>
                  </div>
                </>
              }
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#5f6368]">
                    <th className="text-left pb-2 font-normal">關鍵字</th>
                    <th className="text-right pb-2 font-normal">費用</th>
                    <th className="text-right pb-2 font-normal">點擊</th>
                    <th className="text-right pb-2 font-normal bg-[#e8f0fe] px-2 rounded">購買/銷售</th>
                  </tr>
                </thead>
                <tbody>
                  {KEYWORDS.map((k) => (
                    <tr key={k.name} className="border-t border-[#f1f3f4]">
                      <td className="py-1.5 text-[#1a73e8]">{k.name}</td>
                      <td className="py-1.5 text-right">{formatCurrency(k.cost)}</td>
                      <td className="py-1.5 text-right">{k.clicks}</td>
                      <td className="py-1.5 text-right bg-[#e8f0fe] px-2">{k.conv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WidgetCard>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Devices */}
            <WidgetCard
              title="裝置"
              icon={<Smartphone size={16} />}
              footer={<a href="#" className="text-[#1a73e8] hover:underline ml-auto">裝置</a>}
            >
              <div className="flex gap-3 mb-3 text-[10px] text-[#5f6368]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#1a73e8] rounded-full" /> 手機
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#ea4335] rounded-full" /> 平板電腦
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#fbbc04] rounded-full" /> 電腦
                </span>
              </div>
              {deviceData.map((d) => (
                <div key={d.metric} className="mb-2">
                  <div className="text-[10px] text-[#5f6368] mb-1">{d.metric}</div>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div className="bg-[#1a73e8]" style={{ width: `${d.mobile}%` }} />
                    <div className="bg-[#ea4335]" style={{ width: `${d.tablet}%` }} />
                    <div className="bg-[#fbbc04]" style={{ width: `${d.desktop}%` }} />
                  </div>
                </div>
              ))}
            </WidgetCard>

            {/* Biggest changes */}
            <WidgetCard
              title="最大變化"
              icon={<TrendingDown size={16} />}
              headerRight={
                <select className="text-xs border border-[#dadce0] rounded px-2 py-0.5">
                  <option>購買/銷售</option>
                </select>
              }
            >
              <div className="text-[10px] text-[#5f6368] mb-2 flex justify-between">
                <span>2026年7月1日 – 7日</span>
                <span>與 2026年6月24日 – 30日 比較</span>
              </div>
              {topCampaigns.slice(0, 3).map((c, i) => (
                <div key={c.campaign_name} className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-[#202124] truncate">{c.campaign_name}</div>
                    <div className="h-2 bg-[#f1f3f4] rounded-full mt-1">
                      <div
                        className="h-full bg-[#1a73e8] rounded-full"
                        style={{ width: `${60 - i * 15}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[#d93025] shrink-0">
                    -{(75 - i * 10).toFixed(2)}%
                  </span>
                </div>
              ))}
            </WidgetCard>

            {/* Auction insights */}
            <WidgetCard
              title="競價分析"
              icon={<BarChart2 size={16} />}
              footer={<a href="#" className="text-[#1a73e8] hover:underline ml-auto">競價分析</a>}
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="網頁頂端曝光率"
                      tick={{ fontSize: 9, fill: "#5f6368" }}
                      label={{ value: "網頁頂端曝光率 (%)", position: "bottom", fontSize: 9, fill: "#5f6368" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="曝光比重"
                      tick={{ fontSize: 9, fill: "#5f6368" }}
                      label={{ value: "曝光比重 (%)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#5f6368" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 200]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter
                      data={COMPETITORS}
                      fill="#1a73e8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMPETITORS.map((c, i) => (
                  <span key={c.name} className="text-[9px] text-[#5f6368] flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: ["#1a73e8", "#ea4335", "#fbbc04", "#34a853", "#9334e6"][i] }}
                    />
                    {c.name}
                  </span>
                ))}
              </div>
            </WidgetCard>
          </div>
        </div>
      </div>
    </div>
  );
}
