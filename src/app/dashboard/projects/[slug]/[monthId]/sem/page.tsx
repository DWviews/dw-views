"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import MonthReportNav from "@/components/dashboard/MonthReportNav";
import {
  apiProjectPath,
  fetchProjectJson,
  normalizeProjectSlug,
} from "@/lib/project-api";

interface SemShot {
  id: number;
  title: string;
  imageUrl: string;
  uploadedAt: string;
}

export default function SemScreenshotsPage() {
  const params = useParams();
  const slug = normalizeProjectSlug(params.slug as string);
  const monthId = params.monthId as string;
  const [projectName, setProjectName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [dateRange, setDateRange] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<SemShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug || !monthId) return;

    fetchProjectJson<{
      project: { name: string };
      month: { report_month: string; report_date_range: string | null };
      screenshots: SemShot[];
    }>(apiProjectPath(slug, `months/${monthId}/sem-screenshots`))
      .then((data) => {
        setProjectName(data.project.name);
        setReportMonth(data.month.report_month);
        setDateRange(data.month.report_date_range);
        setScreenshots(data.screenshots || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "無法載入 SEM 截圖");
      })
      .finally(() => setLoading(false));
  }, [slug, monthId]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) =>
          i === null ? null : (i - 1 + screenshots.length) % screenshots.length
        );
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) =>
          i === null ? null : (i + 1) % screenshots.length
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, screenshots.length, closeLightbox]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#12377A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dw-page">
        <MonthReportNav slug={slug} monthId={monthId} active="sem" />
        <p className="text-[#d93025] text-sm">{error}</p>
      </div>
    );
  }

  const active =
    lightboxIndex !== null ? screenshots[lightboxIndex] : null;

  return (
    <div className="min-h-full bg-[#F2F9FC]">
      <div className="dw-page dw-page-wide">
        <MonthReportNav
          slug={slug}
          monthId={monthId}
          active="sem"
          projectName={projectName}
          reportMonth={reportMonth}
        />

        <header className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] flex items-center justify-center text-[#12377A] shrink-0">
              <Search size={18} />
            </div>
            <div className="min-w-0">
              <p className="dw-section-label mb-0.5">Search Engine Result</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-[#12377A]">
                SEM Search 截圖
              </h1>
              <p className="text-sm text-[#858481] mt-1">
                {reportMonth}
                {dateRange ? ` · ${dateRange}` : ""}
                {" · "}
                {screenshots.length} 張搜尋結果截圖
              </p>
            </div>
          </div>
        </header>

        {screenshots.length === 0 ? (
          <div className="dw-card px-6 py-16 text-center">
            <ImageIcon size={36} className="mx-auto text-[#dadce0] mb-3" />
            <p className="text-sm font-medium text-[#12377A]">
              本月尚無 SEM Search 截圖
            </p>
            <p className="text-xs text-[#858481] mt-1.5 max-w-sm mx-auto">
              管理員上傳每月搜尋引擎結果頁截圖後，將顯示於此供您檢視。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {screenshots.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group text-left dw-card overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12377A]"
              >
                <div className="relative bg-[#f1f3f4] aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.imageUrl}
                    alt={shot.title}
                    className="w-full h-full object-contain object-top"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 bg-white/95 text-[#12377A] text-xs font-medium px-3 py-1.5 rounded-full shadow">
                      <ZoomIn size={14} />
                      放大檢視
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-[#dadce0]">
                  <div className="text-sm font-medium text-[#202124] truncate">
                    {shot.title}
                  </div>
                  <div className="text-xs text-[#858481] mt-0.5">
                    {new Date(shot.uploadedAt).toLocaleDateString("zh-HK")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {active && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col"
          role="dialog"
          aria-modal
          aria-label={active.title}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white shrink-0">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{active.title}</div>
              <div className="text-xs text-white/60">
                {lightboxIndex + 1} / {screenshots.length}
              </div>
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full hover:bg-white/10"
              aria-label="關閉"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center px-4 pb-6 min-h-0">
            {screenshots.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + screenshots.length) %
                        screenshots.length
                    )
                  }
                  className="absolute left-2 sm:left-4 z-10 inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white/90 text-[#202124] hover:bg-white shadow"
                  aria-label="上一張"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((lightboxIndex + 1) % screenshots.length)
                  }
                  className="absolute right-2 sm:right-4 z-10 inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white/90 text-[#202124] hover:bg-white shadow"
                  aria-label="下一張"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.imageUrl}
              alt={active.title}
              className="max-h-full max-w-full object-contain rounded shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
