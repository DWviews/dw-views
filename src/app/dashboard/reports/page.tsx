"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  totals: {
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_cost: number;
  };
  topCampaigns: {
    campaign_name: string;
    cost: number;
    clicks: number;
    conversions: number;
    campaign_type?: string;
  }[];
}

const COLORS = ["#1a73e8", "#1e8e3e", "#f9ab00", "#d93025", "#9334e6"];

function formatCurrency(n: number): string {
  return "NT$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const costByCampaign = data.topCampaigns.map((c) => ({
    name: c.campaign_name,
    value: c.cost,
  }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-normal text-[#202124] mb-2">報表</h1>
      <p className="text-sm text-[#5f6368] mb-6">廣告成效分析報表</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#dadce0] rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">各廣告活動費用分佈</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costByCampaign}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name.slice(0, 8)}... ${(percent * 100).toFixed(0)}%`
                }
              >
                {costByCampaign.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[#dadce0] rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">點擊與轉換比較</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCampaigns}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis
                dataKey="campaign_name"
                tick={{ fontSize: 10, fill: "#5f6368" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11, fill: "#5f6368" }} />
              <Tooltip />
              <Bar dataKey="clicks" fill="#1a73e8" name="點擊" />
              <Bar dataKey="conversions" fill="#1e8e3e" name="轉換" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 border border-[#dadce0] rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">總覽摘要</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="label">總曝光</div>
            <div className="value">
              {data.totals.total_impressions.toLocaleString()}
            </div>
          </div>
          <div className="metric-card">
            <div className="label">總點擊</div>
            <div className="value">
              {data.totals.total_clicks.toLocaleString()}
            </div>
          </div>
          <div className="metric-card">
            <div className="label">總轉換</div>
            <div className="value">{data.totals.total_conversions}</div>
          </div>
          <div className="metric-card">
            <div className="label">總費用</div>
            <div className="value">
              {formatCurrency(data.totals.total_cost)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
