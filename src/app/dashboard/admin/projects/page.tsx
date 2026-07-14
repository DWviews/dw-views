"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload,
  CheckCircle,
  Plus,
  ArrowLeft,
  Calendar,
  Clipboard,
  ClipboardPaste,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import { apiProjectPath, projectPagePath } from "@/lib/project-api";
import ClientAccountPanel from "@/components/dashboard/ClientAccountPanel";

interface Project {
  id: number;
  name: string;
  slug: string;
  campaign_name: string;
  month_count: number;
}

interface ProjectMonth {
  id: number;
  report_month: string;
  report_date_range: string | null;
  status: string;
  views_approved: number;
  csv_count: number;
}

type MetricBiasSetting = "auto" | "higher" | "lower";

const CSV_LABELS: Record<string, string> = {
  "01": "活動績效 (Campaign)",
  "02": "每日曝光 (Day of Week)",
  "03": "人口統計 (Demographics)",
  "04": "設備性能 (Device)",
  "05": "地理分布 (Location)",
  "06": "競爭分析 (Auction Insights)",
};

const RANDOMIZE_SECTIONS = [
  "weekday",
  "audience",
  "device",
  "location",
  "auction",
  "dailyTrend",
];

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);
  const [months, setMonths] = useState<ProjectMonth[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateMonth, setShowCreateMonth] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCampaign, setNewCampaign] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newMonthLabel, setNewMonthLabel] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [editMeta, setEditMeta] = useState({
    name: "",
    campaignName: "",
    reportMonth: "",
    reportDateRange: "",
  });
  const [editMetrics, setEditMetrics] = useState({
    clicks: 0,
    impressions: 0,
    ctr: 0,
    convRate: 0,
    cost: 0,
    conversions: 0,
  });
  const [metricsAvailable, setMetricsAvailable] = useState(false);
  const [keywordFile, setKeywordFile] = useState<File | null>(null);
  const [uploadingKeywords, setUploadingKeywords] = useState(false);
  const [randomSimilarity, setRandomSimilarity] = useState(85);
  const [randomCost, setRandomCost] = useState(0);
  const [randomSourceMonthId, setRandomSourceMonthId] = useState<number | null>(
    null
  );
  const [randomBias, setRandomBias] = useState<{
    clicks: MetricBiasSetting;
    impressions: MetricBiasSetting;
    ctr: MetricBiasSetting;
    convRate: MetricBiasSetting;
  }>({
    clicks: "auto",
    impressions: "auto",
    ctr: "auto",
    convRate: "auto",
  });
  const [randomSettingsText, setRandomSettingsText] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  function loadMetrics(slug: string, monthId: number) {
    fetch(apiProjectPath(slug, `months/${monthId}/metrics`))
      .then(async (r) => {
        const d = await r.json();
        if (d.metrics) {
          setEditMetrics(d.metrics);
          setRandomCost(d.metrics.cost);
          setMetricsAvailable(true);
          return;
        }

        const reportRes = await fetch(apiProjectPath(slug, `months/${monthId}`));
        const reportData = await reportRes.json();
        if (reportRes.ok && reportData.report?.page2?.metrics) {
          const m = reportData.report.page2.metrics;
          const parseMetricValue = (value: string, index: number) => {
            if (!value) return 0;
            if (index === 1 && /K/i.test(value)) {
              return Math.round(parseFloat(value.replace(/[^0-9.]/g, "")) * 1000);
            }
            return Number(value.replace(/[^0-9.-]/g, "")) || 0;
          };
          setEditMetrics({
            clicks: parseMetricValue(m[0]?.value ?? "0", 0),
            impressions: parseMetricValue(m[1]?.value ?? "0", 1),
            convRate: parseMetricValue(m[2]?.value ?? "0", 2),
            ctr: parseMetricValue(m[3]?.value ?? "0", 3),
            cost: parseMetricValue(m[4]?.value ?? "0", 4),
            conversions: parseMetricValue(m[5]?.value ?? "0", 5),
          });
          setRandomCost(parseMetricValue(m[4]?.value ?? "0", 4));
          setMetricsAvailable(true);
          return;
        }

        setMetricsAvailable(false);
      })
      .catch(() => setMetricsAvailable(false));
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    fetchMonths(selectedSlug);
  }, [selectedSlug]);

  function fetchProjects() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }

  function fetchMonths(slug: string) {
    fetch(apiProjectPath(slug))
      .then((r) => r.json())
      .then((d) => {
        setMonths(d.months || []);
        if (d.project) {
          setEditMeta((prev) => ({
            ...prev,
            name: d.project.name,
            campaignName: d.project.campaign_name,
          }));
        }
      });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        campaignName: newCampaign,
        reportMonth: newMonth,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    setShowCreate(false);
    setNewName("");
    setSelectedSlug(data.project.slug);
    setSelectedMonthId(data.month?.id ?? null);
    fetchProjects();
    fetchMonths(data.project.slug);
  }

  async function handleCreateMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlug) return;
    const res = await fetch(apiProjectPath(selectedSlug, "months"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportMonth: newMonthLabel }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    setShowCreateMonth(false);
    setNewMonthLabel("");
    setSelectedMonthId(data.month.id);
    fetchMonths(selectedSlug);
    setMessage(`已新增月份 ${data.month.report_month}`);
  }

  async function handleUpload() {
    if (!selectedSlug || !selectedMonthId) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    for (const [type, file] of Object.entries(files)) {
      if (file) formData.append(`file_${type}`, file);
    }

    const res = await fetch(
      apiProjectPath(selectedSlug, `months/${selectedMonthId}/upload`),
      { method: "POST", body: formData }
    );
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setMessage(data.error || "上傳失敗");
      return;
    }

    setMessage(`已上傳 ${data.uploaded.join(", ")}.csv — 共 ${data.csvCount}/6 檔案`);
    setFiles({});
    fetchMonths(selectedSlug);
  }

  async function handleMetaSave() {
    if (!selectedSlug) return;

    await fetch(apiProjectPath(selectedSlug), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editMeta.name,
        campaignName: editMeta.campaignName,
      }),
    });

    if (selectedMonthId) {
      const res = await fetch(
        apiProjectPath(selectedSlug, `months/${selectedMonthId}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportMonth: editMeta.reportMonth,
            reportDateRange: editMeta.reportDateRange,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "更新失敗");
        return;
      }
    }

    setMessage("已更新專案與月份設定");
    fetchProjects();
    fetchMonths(selectedSlug);
  }

  async function handleGenerateNextMonth() {
    if (!selectedSlug || !selectedMonthId) return;
    setGenerating(true);
    setMessage("");
    const res = await fetch(apiProjectPath(selectedSlug, "months/generate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceMonthId: selectedMonthId }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setMessage(data.error || "自動生成失敗");
      return;
    }
    setSelectedMonthId(data.month.id);
    setMessage(data.message || "已自動生成下個月報告");
    fetchMonths(selectedSlug);
    loadMetrics(selectedSlug, data.month.id);
  }

  async function handleApproval(approved: boolean) {
    if (!selectedSlug || !selectedMonthId) return;
    const res = await fetch(
      apiProjectPath(selectedSlug, `months/${selectedMonthId}/approval`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "操作失敗");
      return;
    }
    setMessage(approved ? "已 Approve Views 權限" : "已取消 Views 權限");
    fetchMonths(selectedSlug);
  }

  async function handleKeywordUpload() {
    if (!selectedSlug || !selectedMonthId || !keywordFile) return;
    setUploadingKeywords(true);
    setMessage("");
    const formData = new FormData();
    formData.append("file", keywordFile);
    const res = await fetch(
      apiProjectPath(selectedSlug, `months/${selectedMonthId}/keywords`),
      { method: "POST", body: formData }
    );
    const data = await res.json();
    setUploadingKeywords(false);
    if (!res.ok) {
      setMessage(data.error || "關鍵字檔案上傳失敗");
      return;
    }
    setKeywordFile(null);
    setMessage(data.message || `已匯入 ${data.count} 筆關鍵字`);
  }

  async function handleRandomizeReport() {
    if (!selectedSlug || !selectedMonthId) return;
    setRandomizing(true);
    setMessage("");
    const res = await fetch(
      apiProjectPath(selectedSlug, `months/${selectedMonthId}/randomize`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost: randomCost,
          similarityPct: randomSimilarity,
          sourceMonthId: randomSourceMonthId,
          bias: randomBias,
          sections: RANDOMIZE_SECTIONS,
        }),
      }
    );
    const data = await res.json();
    setRandomizing(false);
    if (!res.ok) {
      setMessage(data.error || "全報告隨機生成失敗");
      return;
    }
    if (data.metrics) {
      setEditMetrics(data.metrics);
      setRandomCost(data.metrics.cost);
    }
    setMessage(data.message || "已生成全部報告數據");
    fetchMonths(selectedSlug);
    loadMetrics(selectedSlug, selectedMonthId);
  }

  async function handleCopyRandomSettings() {
    const payload = JSON.stringify(
      {
        cost: randomCost,
        similarityPct: randomSimilarity,
        sourceMonthId: randomSourceMonthId,
        bias: randomBias,
        sections: RANDOMIZE_SECTIONS,
      },
      null,
      2
    );
    setRandomSettingsText(payload);
    try {
      await navigator.clipboard.writeText(payload);
      setMessage("已複製生成設定");
    } catch {
      setMessage("已產生設定，可手動複製文字框內容");
    }
  }

  function handleApplyRandomSettings() {
    try {
      const parsed = JSON.parse(randomSettingsText) as {
        cost?: number;
        similarityPct?: number;
        sourceMonthId?: number;
        bias?: Partial<Record<keyof typeof randomBias, MetricBiasSetting>>;
        sections?: string[];
      };
      const similarityPct = Math.min(
        100,
        Math.max(0, Math.round(Number(parsed.similarityPct) || 85))
      );
      const cost = Math.max(0, Number(parsed.cost) || randomCost);
      const sourceMonthId = Number(parsed.sourceMonthId) || randomSourceMonthId;
      const nextBias = {
        clicks:
          parsed.bias?.clicks === "higher" ||
          parsed.bias?.clicks === "lower" ||
          parsed.bias?.clicks === "auto"
            ? parsed.bias.clicks
            : randomBias.clicks,
        impressions:
          parsed.bias?.impressions === "higher" ||
          parsed.bias?.impressions === "lower" ||
          parsed.bias?.impressions === "auto"
            ? parsed.bias.impressions
            : randomBias.impressions,
        ctr:
          parsed.bias?.ctr === "higher" ||
          parsed.bias?.ctr === "lower" ||
          parsed.bias?.ctr === "auto"
            ? parsed.bias.ctr
            : randomBias.ctr,
        convRate:
          parsed.bias?.convRate === "higher" ||
          parsed.bias?.convRate === "lower" ||
          parsed.bias?.convRate === "auto"
            ? parsed.bias.convRate
            : randomBias.convRate,
      };
      setRandomSimilarity(similarityPct);
      setRandomCost(cost);
      if (sourceMonthId) setRandomSourceMonthId(sourceMonthId);
      setRandomBias(nextBias);
      setRandomSettingsText(
        JSON.stringify(
          {
            cost,
            similarityPct,
            sourceMonthId,
            bias: nextBias,
            sections: Array.isArray(parsed.sections)
              ? parsed.sections
              : RANDOMIZE_SECTIONS,
          },
          null,
          2
        )
      );
      setMessage(
        `已套用生成設定：HK$${cost}、${similarityPct}% 相似度` +
          (sourceMonthId ? `、參考月份 ID ${sourceMonthId}` : "")
      );
    } catch {
      setMessage("貼上設定格式不正確，請使用 Copy 設定產生的 JSON");
    }
  }

  const selected = projects.find((p) => p.slug === selectedSlug);
  const selectedMonth = months.find((m) => m.id === selectedMonthId);
  const randomSourceMonth = months.find((m) => m.id === randomSourceMonthId);
  const readySourceMonths = months.filter((m) => (m.csv_count ?? 0) >= 6);

  useEffect(() => {
    if (!selectedMonthId || months.length === 0) return;
    const ready = months.filter((m) => (m.csv_count ?? 0) >= 6);
    const otherReady = ready.find((m) => m.id !== selectedMonthId);
    setRandomSourceMonthId((prev) => {
      if (
        prev &&
        months.some((m) => m.id === prev && (m.csv_count ?? 0) >= 6)
      ) {
        return prev;
      }
      return otherReady?.id ?? ready[0]?.id ?? selectedMonthId;
    });
  }, [selectedMonthId, months]);

  useEffect(() => {
    if (!selectedMonth) return;
    setEditMeta((prev) => ({
      ...prev,
      reportMonth: selectedMonth.report_month || "",
      reportDateRange: selectedMonth.report_date_range || "",
    }));
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedSlug || !selectedMonthId) {
      setMetricsAvailable(false);
      return;
    }
    loadMetrics(selectedSlug, selectedMonthId);
  }, [selectedSlug, selectedMonthId, months]);

  return (
    <div className="dw-page dw-page-wide">
      <Link href="/dashboard" className="dw-back-link mb-4">
        <ArrowLeft size={14} />
        返回首頁
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="dw-section-label mb-1">系統管理</p>
          <h1 className="text-xl font-semibold text-[#12377A]">專案管理</h1>
          <p className="text-sm text-[#858481]">管理客戶帳戶、專案月份、上傳 CSV、Approve Views 權限</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#12377A] text-white px-4 py-2.5 rounded-lg text-sm min-h-11"
        >
          <Plus size={16} />
          新增專案
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#dadce0] rounded-lg p-5 mb-6"
        >
          <h3 className="text-sm font-semibold text-[#12377A] mb-3">建立新專案</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input className="gads-input" placeholder="專案名稱" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <input className="gads-input" placeholder="廣告活動名稱" value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} />
            <input className="gads-input" placeholder="首個報告月份" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="gads-btn-primary text-sm">建立</button>
            <button type="button" onClick={() => setShowCreate(false)} className="gads-btn-outline text-sm">取消</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-[#12377A] mb-2">專案列表</h3>
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.slug}
                onClick={() => {
                  setSelectedSlug(p.slug);
                  setSelectedMonthId(null);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedSlug === p.slug
                    ? "border-[#12377A] bg-[#e8f0fe]"
                    : "border-[#dadce0] bg-white hover:bg-[#f8f9fa]"
                }`}
              >
                <div className="text-sm font-medium text-[#12377A]">{p.name}</div>
                <div className="text-xs text-[#858481] mt-1">{p.month_count} 個月份</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {selected ? (
            <>
              <ClientAccountPanel
                slug={selected.slug}
                projectName={selected.name}
                canEdit
              />
            <div className="bg-white border border-[#dadce0] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#12377A]">{selected.name} 月份</h3>
                <button
                  onClick={() => setShowCreateMonth(true)}
                  className="text-xs text-[#12377A] border border-[#12377A] px-2 py-1 rounded"
                >
                  + 新增月份
                </button>
              </div>

              {showCreateMonth && (
                <form onSubmit={handleCreateMonth} className="mb-3 flex gap-2">
                  <input
                    className="gads-input flex-1"
                    placeholder="例如 July 2026"
                    value={newMonthLabel}
                    onChange={(e) => setNewMonthLabel(e.target.value)}
                    required
                  />
                  <button type="submit" className="gads-btn-primary text-xs px-3">新增</button>
                </form>
              )}

              <div className="space-y-2">
                {months.map((month) => (
                  <button
                    key={month.id}
                    onClick={() => setSelectedMonthId(month.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedMonthId === month.id
                        ? "border-[#3D8BC1] bg-[#F2F9FC]"
                        : "border-[#dadce0] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[#12377A]">
                      <Calendar size={14} />
                      {month.report_month}
                    </div>
                    <div className="text-xs text-[#858481] mt-1 flex items-center gap-2">
                      {month.status === "ready" ? (
                        <span className="text-[#1e8e3e]">{month.csv_count}/6 就緒</span>
                      ) : (
                        <span>{month.csv_count}/6 CSV</span>
                      )}
                      {month.views_approved ? (
                        <span className="text-[#1e8e3e]">Views 已開放</span>
                      ) : (
                        <span>未 Approve</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            </>
          ) : (
            <div className="bg-white border border-[#dadce0] rounded-lg p-8 text-center text-sm text-[#858481]">
              請選擇專案
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          {selected && selectedMonth ? (
            <div className="bg-white border border-[#dadce0] rounded-lg p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#12377A]">
                    {selectedMonth.report_month}
                  </h3>
                  <p className="text-xs text-[#858481]">{selected.campaign_name}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {selectedMonth.status === "ready" && (
                    <button
                      onClick={handleGenerateNextMonth}
                      disabled={generating}
                      className="inline-flex items-center gap-1 text-xs border border-[#3D8BC1] text-[#12377A] px-3 py-1.5 rounded disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {generating ? "生成中..." : "自動生成下個月"}
                    </button>
                  )}
                  {selectedMonth.views_approved ? (
                    <button
                      onClick={() => handleApproval(false)}
                      className="inline-flex items-center gap-1 text-xs border border-[#d93025] text-[#d93025] px-3 py-1.5 rounded"
                    >
                      <ShieldOff size={12} />
                      取消 Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproval(true)}
                      disabled={selectedMonth.status !== "ready"}
                      className="inline-flex items-center gap-1 text-xs bg-[#1e8e3e] text-white px-3 py-1.5 rounded disabled:opacity-50"
                    >
                      <ShieldCheck size={12} />
                      Approve Views
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-5 rounded-lg bg-[#F2F9FC] border border-[#dadce0] p-4">
                <h4 className="text-sm font-semibold text-[#12377A] mb-3">報告設定</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">專案名稱</label>
                    <input className="gads-input" value={editMeta.name} onChange={(e) => setEditMeta({ ...editMeta, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">廣告活動名稱</label>
                    <input className="gads-input" value={editMeta.campaignName} onChange={(e) => setEditMeta({ ...editMeta, campaignName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">報告月份</label>
                    <input className="gads-input" value={editMeta.reportMonth} onChange={(e) => setEditMeta({ ...editMeta, reportMonth: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">報告月份範圍</label>
                    <input className="gads-input" value={editMeta.reportDateRange} onChange={(e) => setEditMeta({ ...editMeta, reportDateRange: e.target.value })} />
                  </div>
                </div>
                <button onClick={handleMetaSave} className="mt-3 gads-btn-outline text-sm">儲存設定</button>
              </div>

              <div className="mb-5 rounded-lg bg-[#fff8e1] border border-[#fbbc04] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#12377A] mb-1">
                      全報告隨機生成
                    </h4>
                    <p className="text-xs text-[#858481]">
                      輸入目標月份費用，選擇參考月份與相似度，系統會依參考月分布生成到目前選中的月份。
                    </p>
                  </div>
                  <Sparkles size={16} className="text-[#f9ab00] shrink-0" />
                </div>

                <p className="text-xs text-[#12377A] mb-3">
                  生成目標：
                  <span className="font-semibold">{selectedMonth.report_month}</span>
                  {randomSourceMonth ? (
                    <>
                      {" "}
                      · 參考月份：
                      <span className="font-semibold">
                        {randomSourceMonth.report_month}
                      </span>
                    </>
                  ) : null}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">
                      費用 (HK$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="gads-input"
                      value={randomCost}
                      onChange={(e) =>
                        setRandomCost(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#858481] mb-1">
                      參考月份
                    </label>
                    <select
                      className="gads-input"
                      value={randomSourceMonthId ?? ""}
                      onChange={(e) =>
                        setRandomSourceMonthId(Number(e.target.value) || null)
                      }
                    >
                      {readySourceMonths.length === 0 ? (
                        <option value="">尚無可用參考月份</option>
                      ) : (
                        readySourceMonths.map((month) => (
                          <option key={month.id} value={month.id}>
                            {month.report_month}
                            {month.id === selectedMonthId ? "（目前月份）" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-[#858481]">
                        相似度 (%)
                      </label>
                      <span className="text-xs font-semibold text-[#12377A]">
                        {randomSimilarity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={randomSimilarity}
                      onChange={(e) =>
                        setRandomSimilarity(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {(
                    [
                      ["clicks", "點擊數"],
                      ["impressions", "曝光數"],
                      ["ctr", "CTR"],
                      ["convRate", "轉換率"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-[#858481] mb-1">
                        {label} 偏向
                      </label>
                      <select
                        className="gads-input"
                        value={randomBias[key]}
                        onChange={(e) =>
                          setRandomBias((prev) => ({
                            ...prev,
                            [key]: e.target.value as MetricBiasSetting,
                          }))
                        }
                      >
                        <option value="auto">自動</option>
                        <option value="higher">較高</option>
                        <option value="lower">較低</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <button
                    onClick={handleRandomizeReport}
                    disabled={
                      randomizing ||
                      randomCost <= 0 ||
                      !randomSourceMonthId ||
                      readySourceMonths.length === 0
                    }
                    className="gads-btn-primary text-xs disabled:opacity-50"
                  >
                    {randomizing ? "生成中..." : "重新生成全部數據"}
                  </button>
                  <button
                    onClick={handleCopyRandomSettings}
                    className="inline-flex items-center justify-center gap-1 text-xs border border-[#dadce0] text-[#12377A] px-3 py-2 rounded"
                  >
                    <Clipboard size={12} />
                    Copy 設定
                  </button>
                  <button
                    onClick={handleApplyRandomSettings}
                    disabled={!randomSettingsText.trim()}
                    className="inline-flex items-center justify-center gap-1 text-xs border border-[#dadce0] text-[#12377A] px-3 py-2 rounded disabled:opacity-50"
                  >
                    <ClipboardPaste size={12} />
                    Paste 設定
                  </button>
                </div>

                <textarea
                  className="gads-input min-h-[72px] font-mono text-xs"
                  placeholder='貼上設定 JSON，例如 { "cost": 12000, "sourceMonthId": 3, "similarityPct": 85, "bias": { "ctr": "higher", "convRate": "lower" } }'
                  value={randomSettingsText}
                  onChange={(e) => setRandomSettingsText(e.target.value)}
                />
                {readySourceMonths.length === 0 && (
                  <p className="text-xs text-[#d93025] mt-2">
                    請先讓至少一個月份具備 6 份 CSV，才可作為參考月份生成。
                  </p>
                )}
              </div>

              <div className="mb-5 rounded-lg bg-white border border-[#dadce0] p-4">
                <h4 className="text-sm font-semibold text-[#12377A] mb-1">月度專案數值</h4>
                <p className="text-xs text-[#858481] mb-3">
                  生成後自動更新，其他指標會依費用等比推算
                </p>
                {metricsAvailable || (selectedMonth.csv_count ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">總點擊數</div>
                      <div className="font-medium text-[#12377A]">
                        {editMetrics.clicks.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">總曝光數</div>
                      <div className="font-medium text-[#12377A]">
                        {editMetrics.impressions.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">點擊率 CTR</div>
                      <div className="font-medium text-[#12377A]">{editMetrics.ctr}%</div>
                    </div>
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">轉換率</div>
                      <div className="font-medium text-[#12377A]">{editMetrics.convRate}%</div>
                    </div>
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">費用 (HK$)</div>
                      <div className="font-medium text-[#12377A]">
                        {editMetrics.cost.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="rounded bg-[#f8f9fa] px-3 py-2">
                      <div className="text-[10px] text-[#858481]">轉換數</div>
                      <div className="font-medium text-[#12377A]">
                        {editMetrics.conversions.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#858481]">
                    此月份尚無資料，請先上傳 CSV 或使用「自動生成下個月」建立報告
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {Object.entries(CSV_LABELS).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="font-mono text-sm text-[#12377A] w-16 shrink-0">{type}.csv</span>
                    <span className="text-xs text-[#858481] w-40 shrink-0">{label}</span>
                    <label className="flex-1 cursor-pointer">
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => setFiles({ ...files, [type]: e.target.files?.[0] || null })} />
                      <div className="border border-dashed border-[#dadce0] rounded px-3 py-2 text-xs text-[#858481] hover:border-[#12377A]">
                        {files[type] ? <span className="text-[#1e8e3e]">{files[type]!.name}</span> : "選擇檔案..."}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-[#dadce0]">
                <h4 className="text-sm font-semibold text-[#12377A] mb-1">
                  每月關鍵字報告
                </h4>
                <p className="text-xs text-[#858481] mb-3">
                  上傳 Google Ads 關鍵字報告（CSV 或 Excel），讀取 Keyword、Impr.、Clicks、CTR、Cost、Avg. CPC、Impr. (Abs. Top) %、Impr. (Top) %
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) =>
                        setKeywordFile(e.target.files?.[0] || null)
                      }
                    />
                    <div className="border border-dashed border-[#dadce0] rounded px-3 py-2 text-xs text-[#858481] hover:border-[#12377A]">
                      {keywordFile ? (
                        <span className="text-[#1e8e3e]">{keywordFile.name}</span>
                      ) : (
                        "選擇 CSV 或 Excel 檔案..."
                      )}
                    </div>
                  </label>
                  <button
                    onClick={handleKeywordUpload}
                    disabled={uploadingKeywords || !keywordFile}
                    className="gads-btn-outline text-sm disabled:opacity-50 shrink-0"
                  >
                    {uploadingKeywords ? "匯入中..." : "上傳關鍵字"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || Object.values(files).every((f) => !f)}
                className="mt-4 flex items-center gap-2 bg-[#12377A] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                <Upload size={16} />
                {uploading ? "上傳中..." : "上傳 CSV 檔案"}
              </button>

              {message && <p className="mt-3 text-sm text-[#1e8e3e]">{message}</p>}

              {selectedMonth.status === "ready" && (
                <Link
                  href={projectPagePath(selected.slug, String(selectedMonth.id))}
                  className="mt-4 inline-flex items-center gap-1 text-sm text-[#12377A] hover:underline"
                >
                  <CheckCircle size={14} />
                  查看報告 →
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#dadce0] rounded-lg p-12 text-center text-[#858481] text-sm">
              {selected ? "請選擇一個月份" : "請先選擇專案"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
