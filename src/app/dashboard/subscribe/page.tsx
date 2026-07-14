"use client";

import { useState } from "react";
import {
  Check,
  X,
  Zap,
  BarChart3,
  Bell,
  Shield,
  Sparkles,
  Crown,
} from "lucide-react";
import { copyrightLine } from "@/lib/app-version";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  highlight?: boolean;
  badge?: string;
  features: PlanFeature[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Views 基礎版",
    price: "免費",
    period: "已啟用",
    description: "您目前使用的方案，涵蓋月度報告與儀表板檢視功能。",
    icon: <BarChart3 size={24} />,
    features: [
      { text: "月度報告檢視（9 頁完整分析）", included: true },
      { text: "數據儀表板檢視", included: true },
      { text: "關鍵字成效報告瀏覽", included: true },
      { text: "PDF 報告匯出", included: true },
      { text: "人口統計與裝置分析", included: true },
      { text: "即時數據同步（24 小時內）", included: false },
      { text: "多專案帳號管理", included: false },
      { text: "AI 智能出價建議", included: false },
      { text: "自訂 KPI 告警推播", included: false },
      { text: "白標品牌客製化報告", included: false },
    ],
    cta: "目前方案",
  },
  {
    id: "pro",
    name: "Views Pro",
    price: "USD $99",
    period: "/ 月",
    description: "適合中小型行銷團隊，強化分析深度與自動化報告能力。",
    icon: <Zap size={24} />,
    highlight: true,
    badge: "最受歡迎",
    features: [
      { text: "基礎版全部功能", included: true },
      { text: "每週自動成效摘要郵件", included: true },
      { text: "90 天歷史趨勢對比分析", included: true },
      { text: "競品關鍵字追蹤（最多 50 組）", included: true },
      { text: "關鍵字排名變化警示", included: true },
      { text: "自訂報告範本與備註", included: true },
      { text: "多專案帳號管理（最多 5 個）", included: true },
      { text: "優先客服支援（48 小時內回覆）", included: true },
      { text: "24 小時即時數據監控", included: false },
      { text: "AI 智能出價建議", included: false },
      { text: "白標品牌客製化報告", included: false },
    ],
    cta: "訂閱 Pro",
  },
  {
    id: "enterprise",
    name: "Views Enterprise",
    price: "USD $499",
    period: "/ 月",
    description: "企業級全方位方案，即時監控、AI 驅動決策與專屬服務。",
    icon: <Crown size={24} />,
    badge: "企業首選",
    features: [
      { text: "Pro 版全部功能", included: true },
      { text: "24 小時即時數據監控儀表板", included: true },
      { text: "Google Ads API 即時串接", included: true },
      { text: "多帳號集中管理（50+ 帳號）", included: true },
      { text: "AI 智能出價與預算建議", included: true },
      { text: "自訂 KPI 告警推播（Email / Slack）", included: true },
      { text: "白標品牌客製化報告", included: true },
      { text: "跨平台整合（Meta · LINE Ads）", included: true },
      { text: "專屬客戶成功經理", included: true },
      { text: "SLA 99.9% 可用性保障", included: true },
      { text: "無限專案與歷史數據存取", included: true },
    ],
    cta: "訂閱 Enterprise",
  },
];

export default function SubscribePage() {
  const [toast, setToast] = useState("");

  function handleSubscribe(planName: string) {
    setToast(`「${planName}」訂閱功能即將推出，請聯繫 Diamond Wise 團隊。`);
    setTimeout(() => setToast(""), 4000);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#e8f0fe] text-[#12377A] px-3 py-1 rounded-full text-xs font-medium mb-4">
          <Sparkles size={14} />
          升級您的分析能力
        </div>
        <h1 className="text-2xl font-bold text-[#12377A]">訂閱更多功能</h1>
        <p className="text-sm text-[#858481] mt-2 max-w-lg mx-auto">
          解鎖進階分析、自動化報告與即時監控功能，讓廣告決策更精準、更高效。
          大中華區服務：中國大陸 · 香港 · 台灣
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border flex flex-col ${
              plan.highlight
                ? "border-[#12377A] shadow-lg ring-1 ring-[#12377A]/20"
                : "border-[#dadce0]"
            }`}
          >
            {plan.badge && (
              <div
                className={`text-center text-xs font-medium py-1.5 rounded-t-xl ${
                  plan.highlight
                    ? "bg-[#12377A] text-white"
                    : "bg-[#f1f3f4] text-[#858481]"
                }`}
              >
                {plan.badge}
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlight
                      ? "bg-[#12377A] text-white"
                      : "bg-[#e8f0fe] text-[#12377A]"
                  }`}
                >
                  {plan.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[#12377A]">{plan.name}</h3>
                  <p className="text-xs text-[#858481]">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-[#12377A]">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-[#858481] ml-1">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-[#1e8e3e] shrink-0 mt-0.5" />
                    ) : (
                      <X size={16} className="text-[#dadce0] shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "text-[#202124]" : "text-[#bdc1c6]"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() =>
                  plan.id === "free" ? undefined : handleSubscribe(plan.name)
                }
                disabled={plan.id === "free"}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  plan.id === "free"
                    ? "bg-[#f1f3f4] text-[#858481] cursor-default"
                    : plan.highlight
                      ? "bg-[#12377A] text-white hover:bg-[#0d2a5e]"
                      : "bg-white text-[#12377A] border border-[#12377A] hover:bg-[#e8f0fe]"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Feature highlights */}
      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: <Bell size={20} />,
            title: "智能告警",
            desc: "關鍵字排名、預算消耗異常即時通知",
          },
          {
            icon: <Shield size={20} />,
            title: "企業級安全",
            desc: "RBAC 權限控管 · 資料加密傳輸",
          },
          {
            icon: <Sparkles size={20} />,
            title: "AI 驅動",
            desc: "智能出價建議 · 預算分配優化",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white border border-[#dadce0] rounded-lg p-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-[#e8f0fe] text-[#12377A] flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-[#12377A]">{item.title}</div>
              <div className="text-xs text-[#858481] mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[#9aa0a6] mt-8">
        {copyrightLine("訂閱方案價格以美元計價，實際功能以合約為準")}
      </p>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#12377A] text-white px-6 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
