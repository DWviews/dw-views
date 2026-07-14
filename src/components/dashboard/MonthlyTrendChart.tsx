"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { Activity, Pencil, RotateCcw, Save, X } from "lucide-react";
import { apiProjectPath, fetchProjectJson } from "@/lib/project-api";
import type {
  DailyTrendPoint,
  DailyTrendPromoConfig,
  WeekdayChartPoint,
} from "@/lib/daily-trend-shared";
import { defaultPromoRange, formatDayAxisLabel, LONG_PROMO_DAY_THRESHOLD } from "@/lib/daily-trend-shared";
import ChartContainer from "@/components/dashboard/ChartContainer";

interface MonthlyTrendChartProps {
  projectSlug: string;
  monthId: string;
  totalClicks: number;
  totalConversions: number;
  totalImpressions: number;
  ctr: number;
  convRate: number;
  reportMonth: string;
  isAdmin: boolean;
  weekdaySeed?: WeekdayChartPoint[];
}

export default function MonthlyTrendChart({
  projectSlug,
  monthId,
  totalClicks,
  totalConversions,
  totalImpressions,
  ctr,
  convRate,
  reportMonth,
  isAdmin,
  weekdaySeed = [],
}: MonthlyTrendChartProps) {
  const [points, setPoints] = useState<DailyTrendPoint[]>([]);
  const [promo, setPromo] = useState<DailyTrendPromoConfig>({
    promoStartDay: 1,
    promoEndDay: 30,
  });
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DailyTrendPoint[]>([]);
  const [draftPromo, setDraftPromo] = useState<DailyTrendPromoConfig>({
    promoStartDay: 1,
    promoEndDay: 30,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTrend() {
    setLoading(true);
    setMessage("");
    try {
      const weekdayQuery =
        weekdaySeed.length > 0
          ? `&weekday=${encodeURIComponent(JSON.stringify(weekdaySeed))}`
          : "";
      const data = await fetchProjectJson<{
        points: DailyTrendPoint[];
        promo: DailyTrendPromoConfig;
        daysInMonth: number;
      }>(
        `${apiProjectPath(projectSlug, `months/${monthId}/daily-trend`)}?clicks=${totalClicks}&conversions=${totalConversions}&impressions=${totalImpressions}&ctr=${ctr}&convRate=${convRate}${weekdayQuery}`
      );
      const nextPoints = Array.isArray(data.points) ? data.points : [];
      const nextDays =
        Number(data.daysInMonth) > 0 ? Number(data.daysInMonth) : 30;
      const nextPromo = data.promo ?? defaultPromoRange(nextDays);
      setPoints(nextPoints);
      setPromo(nextPromo);
      setDaysInMonth(nextDays);
      setDraft(nextPoints);
      setDraftPromo(nextPromo);
    } catch (err) {
      setPoints([]);
      setDraft([]);
      setMessage(err instanceof Error ? err.message : "載入趨勢失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug, monthId, totalClicks, totalConversions]);

  const activePromo = editing ? draftPromo : promo;
  const chartData = useMemo(
    () =>
      (editing ? draft : points).map((point) => ({
        day: point.day,
        label: formatDayAxisLabel(reportMonth || "", point.day),
        點擊: Number(point.clicks) || 0,
        轉換: Number(point.conversions) || 0,
        inPromo:
          point.day >= activePromo.promoStartDay &&
          point.day <= activePromo.promoEndDay,
      })),
    [editing, draft, points, activePromo, reportMonth]
  );

  const promoStartLabel = formatDayAxisLabel(
    reportMonth,
    activePromo.promoStartDay
  );
  const promoEndLabel = formatDayAxisLabel(reportMonth, activePromo.promoEndDay);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const data = await fetchProjectJson<{
        points: DailyTrendPoint[];
        promo: DailyTrendPromoConfig;
        message?: string;
      }>(apiProjectPath(projectSlug, `months/${monthId}/daily-trend`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: draft,
          promoStartDay: draftPromo.promoStartDay,
          promoEndDay: draftPromo.promoEndDay,
          weekdayChart: weekdaySeed,
        }),
      });
      setPoints(data.points);
      setPromo(data.promo);
      setDraft(data.points);
      setDraftPromo(data.promo);
      setEditing(false);
      setMessage(data.message || "已儲存");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleAverageReset() {
    setSaving(true);
    setMessage("");
    try {
      const data = await fetchProjectJson<{
        points: DailyTrendPoint[];
        promo: DailyTrendPromoConfig;
        message?: string;
      }>(apiProjectPath(projectSlug, `months/${monthId}/daily-trend`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset: true,
          resetMode: "average",
          totalClicks,
          totalConversions,
          totalImpressions,
          ctr,
          convRate,
          promoStartDay: draftPromo.promoStartDay,
          promoEndDay: draftPromo.promoEndDay,
          weekdayChart: weekdaySeed,
        }),
      });
      setPoints(data.points);
      setPromo(data.promo);
      setDraft(data.points);
      setDraftPromo(data.promo);
      setEditing(false);
      setMessage(data.message || "已重設為平均趨勢（保留閃電起伏）");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "平均趨勢重設失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage("");
    try {
      const data = await fetchProjectJson<{
        points: DailyTrendPoint[];
        promo: DailyTrendPromoConfig;
        message?: string;
      }>(apiProjectPath(projectSlug, `months/${monthId}/daily-trend`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset: true,
          resetMode: "promo",
          totalClicks,
          totalConversions,
          totalImpressions,
          ctr,
          convRate,
          promoStartDay: draftPromo.promoStartDay,
          promoEndDay: draftPromo.promoEndDay,
          weekdayChart: weekdaySeed,
        }),
      });
      setPoints(data.points);
      setPromo(data.promo);
      setDraft(data.points);
      setDraftPromo(data.promo);
      setEditing(false);
      setMessage(
        data.message ||
          `已依優惠期（${data.promo.promoStartDay}–${data.promo.promoEndDay} 日）生成趨勢線，非優惠日轉換較低`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "自動生成失敗");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(
    day: number,
    field: "clicks" | "conversions",
    value: string
  ) {
    const num =
      field === "clicks"
        ? Math.max(0, Math.round(Number(value) || 0))
        : Math.max(0, Math.round((Number(value) || 0) * 10) / 10);
    setDraft((prev) =>
      prev.map((point) =>
        point.day === day ? { ...point, [field]: num } : point
      )
    );
  }

  if (loading) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-[#5f6368]">
        載入趨勢資料中...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#f1f3f4] bg-[#fafafa]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[#202124]">
            月度趨勢（1–{daysInMonth} 日）
          </span>
          {isAdmin && (
            <>
              <span className="text-[10px] font-semibold tracking-wide bg-[#fce8e6] text-[#d93025] px-2 py-0.5 rounded">
                ADMIN MODE
              </span>
              <span className="text-[10px] text-[#5f6368]">
                優惠期 {activePromo.promoStartDay}–{activePromo.promoEndDay} 日
              </span>
            </>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button
                  type="button"
                  onClick={handleAverageReset}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs text-[#5f6368] hover:bg-[#f1f3f4] px-2 py-1 rounded disabled:opacity-50"
                >
                  <Activity size={12} />
                  Reset（平均趨勢）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(points);
                    setDraftPromo(promo);
                    setEditing(true);
                    setMessage("");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#1a73e8] hover:bg-[#e8f0fe] px-2 py-1 rounded"
                >
                  <Pencil size={12} />
                  編輯趨勢線
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs bg-[#1a73e8] text-white px-2.5 py-1 rounded disabled:opacity-50"
                >
                  <Save size={12} />
                  儲存
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs text-[#5f6368] hover:bg-[#f1f3f4] px-2 py-1 rounded"
                >
                  <RotateCcw size={12} />
                  自動生成
                </button>
                <button
                  type="button"
                  onClick={handleAverageReset}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs text-[#5f6368] hover:bg-[#f1f3f4] px-2 py-1 rounded disabled:opacity-50"
                >
                  <Activity size={12} />
                  Reset（平均趨勢）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(points);
                    setDraftPromo(promo);
                    setEditing(false);
                    setMessage("");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#5f6368] hover:bg-[#f1f3f4] px-2 py-1 rounded"
                >
                  <X size={12} />
                  取消
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isAdmin && editing && (
        <div className="px-4 py-3 border-b border-[#f1f3f4] bg-[#fff8e1]">
          <p className="text-xs text-[#5f6368] mb-2">
            優惠期內數值較高，期外仍依星期與 CTR 保持起伏，只是整體低於優惠期。
            若優惠開始／結束超過 24 日，會自動改為全月（1–{daysInMonth}{" "}
            日）平均分佈。
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1 text-[#202124]">
              優惠開始
              <input
                type="number"
                min={1}
                max={daysInMonth}
                value={draftPromo.promoStartDay}
                onChange={(e) =>
                  setDraftPromo((prev) => ({
                    ...prev,
                    promoStartDay: Number(e.target.value),
                  }))
                }
                className="w-16 border border-[#dadce0] rounded px-2 py-1"
              />
              日
            </label>
            <label className="flex items-center gap-1 text-[#202124]">
              優惠結束
              <input
                type="number"
                min={1}
                max={daysInMonth}
                value={draftPromo.promoEndDay}
                onChange={(e) =>
                  setDraftPromo((prev) => ({
                    ...prev,
                    promoEndDay: Number(e.target.value),
                  }))
                }
                className="w-16 border border-[#dadce0] rounded px-2 py-1"
              />
              日
            </label>
            {draftPromo.promoEndDay - draftPromo.promoStartDay + 1 >
              LONG_PROMO_DAY_THRESHOLD && (
              <span className="text-[#e37400]">
                超過 {LONG_PROMO_DAY_THRESHOLD} 日 → 自動生成時平均分佈
                1–{daysInMonth} 日
              </span>
            )}
            <button
              type="button"
              onClick={() => setDraftPromo(defaultPromoRange(daysInMonth))}
              className="text-[#1a73e8] hover:underline"
            >
              建議範圍
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-[#5f6368]">
            {message || "尚無趨勢資料"}
          </div>
        ) : (
          <ChartContainer height={300}>
            <LineChart data={chartData}>
              <ReferenceArea
                x1={promoStartLabel}
                x2={promoEndLabel}
                fill="#fbbc04"
                fillOpacity={0.12}
                strokeOpacity={0}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#5f6368" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(daysInMonth / 10))}
                angle={-42}
                textAnchor="end"
                height={52}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#5f6368" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#5f6368" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { label?: string }
                    | undefined;
                  return row?.label || String(_label ?? "");
                }}
                formatter={(value: number | string, name: string) => {
                  const num = Number(value);
                  const safe = Number.isFinite(num) ? num : 0;
                  return [
                    name === "轉換" ? safe.toFixed(1) : safe.toLocaleString(),
                    name,
                  ];
                }}
              />
              <Line
                yAxisId="left"
                type="linear"
                dataKey="點擊"
                stroke="#4285f4"
                strokeWidth={2.5}
                dot={isAdmin && editing ? { r: 2 } : false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="linear"
                dataKey="轉換"
                stroke="#db4437"
                strokeWidth={2.2}
                dot={isAdmin && editing ? { r: 2 } : false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      {isAdmin && editing && (
        <div className="border-t border-[#f1f3f4] px-4 py-3 bg-[#f8f9fa] max-h-48 overflow-y-auto">
          <p className="text-xs text-[#5f6368] mb-2">
            每日數值（儲存後同步記錄至資料庫）
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {draft.map((point) => {
              const inPromo =
                point.day >= draftPromo.promoStartDay &&
                point.day <= draftPromo.promoEndDay;
              return (
                <div
                  key={point.day}
                  className={`bg-white border rounded p-2 text-[10px] ${
                    inPromo
                      ? "border-[#fbbc04] bg-[#fffdf5]"
                      : "border-[#dadce0]"
                  }`}
                >
                  <div className="font-medium text-[#202124] mb-1">
                    {point.day} 日
                    {inPromo && (
                      <span className="ml-1 text-[#e37400]">優惠</span>
                    )}
                  </div>
                  <label className="flex items-center gap-1 text-[#5f6368] mb-1">
                    點擊
                    <input
                      type="number"
                      min={0}
                      value={point.clicks}
                      onChange={(e) =>
                        updateDraft(point.day, "clicks", e.target.value)
                      }
                      className="w-full border border-[#dadce0] rounded px-1 py-0.5 text-[#202124]"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[#5f6368]">
                    轉換
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={point.conversions}
                      onChange={(e) =>
                        updateDraft(point.day, "conversions", e.target.value)
                      }
                      className="w-full border border-[#dadce0] rounded px-1 py-0.5 text-[#202124]"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && message && (
        <div className="px-4 py-2 text-xs text-[#1e8e3e] border-t border-[#f1f3f4]">
          {message}
        </div>
      )}
    </div>
  );
}
