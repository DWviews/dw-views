"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, RotateCcw, Save } from "lucide-react";
import type { KeywordRow } from "@/lib/keyword-parser";
import { applyKeywordBoosts } from "@/lib/keyword-adjust";
import type { KeywordAdminItem } from "@/lib/project-keywords";
import { downloadKeywordsExcel } from "@/lib/keyword-export";
import { apiProjectPath, fetchProjectJson, projectPagePath, normalizeProjectSlug } from "@/lib/project-api";

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

export default function ProjectKeywordsPage() {
  const params = useParams();
  const slug = normalizeProjectSlug(params.slug as string);
  const monthId = params.monthId as string;
  const [items, setItems] = useState<KeywordAdminItem[]>([]);
  const [boosts, setBoosts] = useState<Record<string, number>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    const keywordData = await fetchProjectJson<{
      isAdmin?: boolean;
      items?: KeywordAdminItem[];
      keywords?: KeywordRow[];
      project?: { name: string };
      month?: { report_month: string };
    }>(apiProjectPath(slug, `months/${monthId}/keywords`));

    setIsAdmin(Boolean(keywordData.isAdmin));
    setProjectName(keywordData.project?.name || "");
    setReportMonth(keywordData.month?.report_month || "");

    if (keywordData.isAdmin && keywordData.items) {
      setItems(keywordData.items);
      const map: Record<string, number> = {};
      for (const item of keywordData.items as KeywordAdminItem[]) {
        map[item.keyword] = item.boostPct;
      }
      setBoosts(map);
    } else {
      const rows = (keywordData.keywords || []) as KeywordRow[];
      setItems(
        rows.map((row) => ({
          keyword: row.keyword,
          boostPct: 0,
          base: row,
          adjusted: row,
        }))
      );
    }
  }

  useEffect(() => {
    if (!slug || !monthId) return;

    loadData()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "無法載入關鍵字資料")
      )
      .finally(() => setLoading(false));
  }, [slug, monthId]);

  const displayItems = useMemo(() => {
    if (!isAdmin || items.length === 0) return items;

    const withBoost = items.map((item) => ({
      ...item.base,
      boostPct: boosts[item.keyword] ?? item.boostPct ?? 0,
    }));
    const adjusted = applyKeywordBoosts(withBoost);
    const adjustedMap = new Map(adjusted.map((row) => [row.keyword, row]));

    return items.map((item) => ({
      ...item,
      boostPct: boosts[item.keyword] ?? item.boostPct ?? 0,
      adjusted: adjustedMap.get(item.keyword) ?? item.adjusted,
    }));
  }, [items, boosts, isAdmin]);

  const sortedDisplay = useMemo(
    () =>
      [...displayItems].sort(
        (a, b) => b.adjusted.impressions - a.adjusted.impressions
      ),
    [displayItems]
  );

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const data = await fetchProjectJson<{
        items?: KeywordAdminItem[];
        message?: string;
      }>(apiProjectPath(slug, `months/${monthId}/keywords`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boosts: items.map((item) => ({
            keyword: item.keyword,
            boostPct: boosts[item.keyword] ?? 0,
          })),
        }),
      });
      if (data.items) {
        setItems(data.items);
        const map: Record<string, number> = {};
        for (const item of data.items as KeywordAdminItem[]) {
          map[item.keyword] = item.boostPct;
        }
        setBoosts(map);
      }
      setMessage(data.message || "已儲存");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.keyword] = 0;
    }
    setBoosts(map);
    setMessage("已重設預覽（請按儲存變更以寫入）");
  }

  function handleExportExcel() {
    downloadKeywordsExcel(
      sortedDisplay.map((item) => ({
        keyword: item.keyword,
        boostPct: item.boostPct,
        adjusted: item.adjusted,
      })),
      {
        projectName,
        reportMonth,
        includeBoost: isAdmin,
      }
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-[#d93025]">{error}</div>;
  }

  return (
    <div className="min-h-full bg-[#f1f3f4] p-4 sm:p-6">
      <div className="max-w-[1500px] mx-auto">
        <Link
          href={projectPagePath(slug, `${monthId}/ads`)}
          className="dw-back-link mb-4 min-h-10"
        >
          <ArrowLeft size={14} />
          返回儀表板
        </Link>

        <div className="bg-white border border-[#dadce0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[#dadce0] flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-medium text-[#202124]">
                {projectName} — 關鍵字詳細列表
              </h1>
              <p className="text-sm text-[#5f6368] mt-1">
                {reportMonth} · 共 {sortedDisplay.length} 筆 · 依 Impr. 由大至小排列
              </p>
              {isAdmin && (
                <p className="text-xs text-[#5f6368] mt-2">
                  可逐筆設定提升 %，其餘關鍵字將平均分攤減少，總 Impr. / Clicks / Cost 維持不變
                </p>
              )}
            </div>
            {sortedDisplay.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1 gads-btn-outline text-sm"
                >
                  <Download size={14} />
                  匯出 Excel
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1 gads-btn-outline text-sm"
                    >
                      <RotateCcw size={14} />
                      重設全部
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1 gads-btn-primary text-sm disabled:opacity-50"
                    >
                      <Save size={14} />
                      {saving ? "儲存中..." : "儲存變更"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {message && (
            <div className="px-6 py-2 text-sm text-[#1e8e3e] bg-[#f6fff8] border-b border-[#dadce0]">
              {message}
            </div>
          )}

          {sortedDisplay.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#5f6368]">
              尚無關鍵字資料，請於專案管理上傳每月關鍵字報告（CSV 或 Excel）
            </div>
          ) : (
            <div className="overflow-x-auto gads-table-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead className="bg-[#f8f9fa] text-[#5f6368]">
                  <tr>
                    <th className="text-left font-normal px-4 py-3">Keyword</th>
                    {isAdmin && (
                      <th className="text-right font-normal px-4 py-3 w-28">
                        提升 %
                      </th>
                    )}
                    <th className="text-right font-normal px-4 py-3">Impr.</th>
                    <th className="text-right font-normal px-4 py-3">Clicks</th>
                    <th className="text-right font-normal px-4 py-3">CTR</th>
                    <th className="text-right font-normal px-4 py-3">Cost</th>
                    <th className="text-right font-normal px-4 py-3">Avg. CPC</th>
                    <th className="text-right font-normal px-4 py-3">
                      Impr. (Abs. Top) %
                    </th>
                    <th className="text-right font-normal px-4 py-3">
                      Impr. (Top) %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisplay.map((item) => {
                    const row = item.adjusted;
                    const changed =
                      isAdmin &&
                      (item.boostPct !== 0 ||
                        row.impressions !== item.base.impressions);
                    return (
                      <tr
                        key={item.keyword}
                        className={`border-t border-[#f1f3f4] hover:bg-[#f8f9fa] ${
                          changed ? "bg-[#f6f9fe]" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[#1a73e8]">
                          {item.keyword}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              step={1}
                              className="gads-input w-20 text-right text-xs ml-auto"
                              value={boosts[item.keyword] ?? 0}
                              onChange={(e) =>
                                setBoosts({
                                  ...boosts,
                                  [item.keyword]: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          {changed && (
                            <span className="block text-[10px] text-[#9aa0a6] line-through">
                              {item.base.impressions.toLocaleString()}
                            </span>
                          )}
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {row.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatPercent(row.ctr)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(row.cost)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(row.avgCpc)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatPercent(row.absTopPct)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatPercent(row.topPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
