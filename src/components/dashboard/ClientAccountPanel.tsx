"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  DollarSign,
  ImagePlus,
  Save,
  Trash2,
  UserRound,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { apiProjectPath } from "@/lib/project-api";
import {
  CONTRACT_STATUS_LABELS,
  SERVICE_TIER_OPTIONS,
  formatBudget,
  formatContractDate,
  getContractStatus,
  hasClientAccountData,
  serviceTierLabel,
  type ClientAccount,
  type ServiceTier,
} from "@/lib/client-account";

interface ClientAccountPanelProps {
  slug: string;
  projectName: string;
  canEdit: boolean;
  compact?: boolean;
}

const EMPTY_FORM: ClientAccount = {
  clientId: null,
  companyName: null,
  contractStartDate: null,
  contractEndDate: null,
  monthlyBudget: null,
  accountManager: null,
  serviceTier: null,
  contractNotes: null,
  logoUrl: null,
};

export default function ClientAccountPanel({
  slug,
  projectName,
  canEdit,
  compact = false,
}: ClientAccountPanelProps) {
  const [account, setAccount] = useState<ClientAccount>(EMPTY_FORM);
  const [form, setForm] = useState<ClientAccount>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError("");
    fetch(apiProjectPath(slug, "client-account"))
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "無法載入客戶帳戶資料");
        const next = data.account as ClientAccount;
        setAccount(next);
        setForm(next);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "載入失敗");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(apiProjectPath(slug, "client-account"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          companyName: form.companyName,
          contractStartDate: form.contractStartDate,
          contractEndDate: form.contractEndDate,
          monthlyBudget: form.monthlyBudget,
          accountManager: form.accountManager,
          serviceTier: form.serviceTier,
          contractNotes: form.contractNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      setAccount(data.account);
      setForm(data.account);
      setMessage(data.message || "已儲存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setMessage("");
    setError("");
    try {
      const body = new FormData();
      body.append("logo", file);
      const res = await fetch(apiProjectPath(slug, "client-account/logo"), {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上傳失敗");
      setAccount(data.account);
      setForm((prev) => ({ ...prev, logoUrl: data.account.logoUrl }));
      setMessage(data.message || "品牌標誌已上傳");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(apiProjectPath(slug, "client-account/logo"), {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "移除失敗");
      setAccount(data.account);
      setForm((prev) => ({ ...prev, logoUrl: null }));
      setMessage(data.message || "品牌標誌已移除");
    } catch (err) {
      setError(err instanceof Error ? err.message : "移除失敗");
    } finally {
      setUploadingLogo(false);
    }
  }

  const contractStatus = getContractStatus(
    account.contractStartDate,
    account.contractEndDate
  );
  const statusMeta = contractStatus
    ? CONTRACT_STATUS_LABELS[contractStatus]
    : null;
  const displayName = account.companyName || projectName;

  if (loading) {
    return (
      <div className="rounded-lg border border-[#dadce0] bg-white p-4">
        <div className="h-4 w-32 bg-[#f1f3f4] rounded animate-pulse mb-3" />
        <div className="h-20 bg-[#f8f9fa] rounded animate-pulse" />
      </div>
    );
  }

  if (error && !hasClientAccountData(account) && !canEdit) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-[#dadce0] bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <LogoPreview
            logoUrl={canEdit ? form.logoUrl : account.logoUrl}
            fallback={displayName}
            size={compact ? 44 : 52}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#12377A]">
                客戶帳戶資料
              </h3>
              {statusMeta && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusMeta.className}`}
                >
                  <BadgeCheck size={10} />
                  {statusMeta.label}
                </span>
              )}
            </div>
            <p className="text-xs text-[#858481] mt-0.5">
              {canEdit
                ? "管理客戶合約資訊與品牌標誌，Viewer 帳號僅可檢視"
                : "客戶合約與服務資訊"}
            </p>
          </div>
        </div>
      </div>

      {canEdit ? (
        <AdminForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          saving={saving}
          onLogoUpload={handleLogoUpload}
          onLogoRemove={handleLogoRemove}
          uploadingLogo={uploadingLogo}
          compact={compact}
        />
      ) : hasClientAccountData(account) ? (
        <ReadonlyView account={account} displayName={displayName} compact={compact} />
      ) : (
        <p className="text-xs text-[#858481]">尚未設定客戶帳戶資料</p>
      )}

      {message && (
        <p className="mt-3 text-xs text-[#1e8e3e]">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-xs text-[#d93025]">{error}</p>
      )}
    </div>
  );
}

function LogoPreview({
  logoUrl,
  fallback,
  size,
}: {
  logoUrl: string | null;
  fallback: string;
  size: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="品牌標誌"
        className="rounded-lg border border-[#dadce0] bg-white object-contain shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #12377A, #3D8BC1)",
        fontSize: size * 0.38,
      }}
    >
      {fallback.charAt(0)}
    </div>
  );
}

function AdminForm({
  form,
  setForm,
  onSave,
  saving,
  onLogoUpload,
  onLogoRemove,
  uploadingLogo,
  compact,
}: {
  form: ClientAccount;
  setForm: React.Dispatch<React.SetStateAction<ClientAccount>>;
  onSave: () => void;
  saving: boolean;
  onLogoUpload: (file: File | null) => void;
  onLogoRemove: () => void;
  uploadingLogo: boolean;
  compact?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div
        className={`grid gap-3 ${
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        <Field label="客戶編號" icon={FileText}>
          <input
            className="gads-input"
            placeholder="例：DW-2026-001"
            value={form.clientId ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, clientId: e.target.value || null }))
            }
          />
        </Field>
        <Field label="公司名稱" icon={Building2}>
          <input
            className="gads-input"
            placeholder="客戶公司全名"
            value={form.companyName ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                companyName: e.target.value || null,
              }))
            }
          />
        </Field>
        <Field label="合約生效日" icon={Calendar}>
          <input
            type="date"
            className="gads-input"
            value={form.contractStartDate ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                contractStartDate: e.target.value || null,
              }))
            }
          />
        </Field>
        <Field label="合約到期日" icon={Calendar}>
          <input
            type="date"
            className="gads-input"
            value={form.contractEndDate ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                contractEndDate: e.target.value || null,
              }))
            }
          />
        </Field>
        <Field label="每月媒體預算 (HK$)" icon={DollarSign}>
          <input
            type="number"
            min={0}
            step={100}
            className="gads-input"
            placeholder="例：15000"
            value={form.monthlyBudget ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                monthlyBudget:
                  e.target.value === ""
                    ? null
                    : Math.max(0, Number(e.target.value)),
              }))
            }
          />
        </Field>
        <Field label="負責客戶經理" icon={UserRound}>
          <input
            className="gads-input"
            placeholder="例：陳大文"
            value={form.accountManager ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                accountManager: e.target.value || null,
              }))
            }
          />
        </Field>
        <Field label="服務方案" icon={BadgeCheck} className={compact ? "" : "sm:col-span-2"}>
          <select
            className="gads-input"
            value={form.serviceTier ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                serviceTier: (e.target.value as ServiceTier) || null,
              }))
            }
          >
            <option value="">請選擇</option>
            {SERVICE_TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="合約備註" icon={FileText} className={compact ? "" : "sm:col-span-2"}>
          <textarea
            className="gads-input min-h-[72px]"
            placeholder="特殊條款、計費週期、服務範圍等"
            value={form.contractNotes ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                contractNotes: e.target.value || null,
              }))
            }
          />
        </Field>
      </div>

      <div className="rounded-lg border border-dashed border-[#dadce0] bg-[#f8f9fa] p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="text-xs font-medium text-[#12377A]">品牌標誌</div>
            <div className="text-[10px] text-[#858481]">
              PNG / JPEG / WebP / SVG，最大 512 KB
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                disabled={uploadingLogo}
                onChange={(e) => {
                  onLogoUpload(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 text-xs border border-[#12377A] text-[#12377A] px-3 py-1.5 rounded cursor-pointer hover:bg-[#e8f0fe]">
                <ImagePlus size={12} />
                {uploadingLogo ? "處理中..." : "上傳標誌"}
              </span>
            </label>
            {form.logoUrl && (
              <button
                type="button"
                onClick={onLogoRemove}
                disabled={uploadingLogo}
                className="inline-flex items-center gap-1 text-xs text-[#d93025] border border-[#d93025] px-3 py-1.5 rounded disabled:opacity-50"
              >
                <Trash2 size={12} />
                移除
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 gads-btn-primary text-sm disabled:opacity-50"
      >
        <Save size={14} />
        {saving ? "儲存中..." : "儲存客戶帳戶資料"}
      </button>
    </div>
  );
}

function ReadonlyView({
  account,
  displayName,
  compact,
}: {
  account: ClientAccount;
  displayName: string;
  compact?: boolean;
}) {
  const items = [
    { label: "客戶編號", value: account.clientId },
    { label: "公司名稱", value: account.companyName || displayName },
    {
      label: "合約生效日",
      value: formatContractDate(account.contractStartDate),
    },
    {
      label: "合約到期日",
      value: formatContractDate(account.contractEndDate),
    },
    {
      label: "每月媒體預算",
      value: formatBudget(account.monthlyBudget),
    },
    { label: "負責客戶經理", value: account.accountManager },
    {
      label: "服務方案",
      value: serviceTierLabel(account.serviceTier),
    },
  ];

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 ${
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-[#f8f9fa] px-3 py-2.5">
            <div className="text-[10px] text-[#858481]">{item.label}</div>
            <div className="text-sm font-medium text-[#12377A] mt-0.5 break-words">
              {item.value || "—"}
            </div>
          </div>
        ))}
      </div>
      {account.contractNotes && (
        <div className="rounded-lg bg-[#f8f9fa] px-3 py-2.5">
          <div className="text-[10px] text-[#858481]">合約備註</div>
          <div className="text-sm text-[#12377A] mt-0.5 whitespace-pre-wrap">
            {account.contractNotes}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className = "",
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1 text-xs text-[#858481] mb-1">
        <Icon size={12} />
        {label}
      </label>
      {children}
    </div>
  );
}

export function ClientAccountAvatar({
  logoUrl,
  name,
  size = 48,
}: {
  logoUrl: string | null | undefined;
  name: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} 品牌標誌`}
        className="rounded-lg border border-[#dadce0] bg-white object-contain shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #12377A, #3D8BC1)",
        fontSize: size * 0.38,
      }}
    >
      {name.charAt(0)}
    </div>
  );
}
