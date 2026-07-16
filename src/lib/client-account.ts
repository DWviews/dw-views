import { resolveProjectLogoUrl } from "@/lib/client-logos";

export interface ClientAccount {
  clientId: string | null;
  companyName: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  monthlyBudget: number | null;
  accountManager: string | null;
  serviceTier: ServiceTier | null;
  contractNotes: string | null;
  logoUrl: string | null;
}

export type ServiceTier = "basic" | "professional" | "enterprise" | "custom";

export type ContractStatus = "active" | "expiring" | "expired" | "pending";

export const SERVICE_TIER_OPTIONS: { value: ServiceTier; label: string }[] = [
  { value: "basic", label: "基礎版" },
  { value: "professional", label: "專業版" },
  { value: "enterprise", label: "企業版" },
  { value: "custom", label: "客製方案" },
];

export const CLIENT_ACCOUNT_FIELDS = [
  "client_id",
  "company_name",
  "contract_start_date",
  "contract_end_date",
  "monthly_budget",
  "account_manager",
  "service_tier",
  "contract_notes",
  "logo_url",
] as const;

export function serviceTierLabel(tier: ServiceTier | null | undefined): string {
  if (!tier) return "—";
  return SERVICE_TIER_OPTIONS.find((o) => o.value === tier)?.label ?? tier;
}

export function formatBudget(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `HK$ ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatContractDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getContractStatus(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): ContractStatus | null {
  if (!startDate && !endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && start > today) {
      return "pending";
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T00:00:00`);
    if (!Number.isNaN(end.getTime())) {
      if (end < today) return "expired";
      const daysLeft = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 30) return "expiring";
    }
  }

  return "active";
}

export const CONTRACT_STATUS_LABELS: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  active: { label: "合約生效中", className: "text-[#1e8e3e] bg-[#e6f4ea]" },
  expiring: { label: "即將到期", className: "text-[#e37400] bg-[#fef7e0]" },
  expired: { label: "合約已到期", className: "text-[#d93025] bg-[#fce8e6]" },
  pending: { label: "待生效", className: "text-[#1967d2] bg-[#e8f0fe]" },
};

export function rowToClientAccount(
  row: Record<string, unknown>
): ClientAccount {
  const budget = row.monthly_budget;
  return {
    clientId: (row.client_id as string | null) ?? null,
    companyName: (row.company_name as string | null) ?? null,
    contractStartDate: (row.contract_start_date as string | null) ?? null,
    contractEndDate: (row.contract_end_date as string | null) ?? null,
    monthlyBudget:
      budget == null ? null : Number.parseFloat(String(budget)),
    accountManager: (row.account_manager as string | null) ?? null,
    serviceTier: (row.service_tier as ServiceTier | null) ?? null,
    contractNotes: (row.contract_notes as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
  };
}

/** 將 DB 列轉為帳戶資料，並解析為可快取的標誌 URL（不含 base64） */
export function enrichClientAccount(
  row: Record<string, unknown>
): ClientAccount {
  const account = rowToClientAccount(row);
  account.logoUrl = resolveProjectLogoUrl(
    row.logo_id as number | null | undefined,
    row.logo_url as string | null | undefined
  );
  return account;
}

export function clientAccountToDbUpdates(
  data: Partial<ClientAccount>
): Record<string, string | number | null> {
  const updates: Record<string, string | number | null> = {};

  if ("clientId" in data) updates.client_id = data.clientId?.trim() || null;
  if ("companyName" in data)
    updates.company_name = data.companyName?.trim() || null;
  if ("contractStartDate" in data)
    updates.contract_start_date = data.contractStartDate || null;
  if ("contractEndDate" in data)
    updates.contract_end_date = data.contractEndDate || null;
  if ("monthlyBudget" in data)
    updates.monthly_budget =
      data.monthlyBudget == null ? null : data.monthlyBudget;
  if ("accountManager" in data)
    updates.account_manager = data.accountManager?.trim() || null;
  if ("serviceTier" in data) updates.service_tier = data.serviceTier || null;
  if ("contractNotes" in data)
    updates.contract_notes = data.contractNotes?.trim() || null;

  return updates;
}

export function hasClientAccountData(account: ClientAccount): boolean {
  return Boolean(
    account.clientId ||
      account.companyName ||
      account.contractStartDate ||
      account.contractEndDate ||
      account.monthlyBudget != null ||
      account.accountManager ||
      account.serviceTier ||
      account.contractNotes ||
      account.logoUrl
  );
}
