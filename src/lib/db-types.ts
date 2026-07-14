export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "editor" | "viewer";
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: number;
  name: string;
  slug: string;
  campaign_name: string;
  report_month: string;
  report_date_range: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  status: "draft" | "ready";
  created_by: number;
  client_id: string | null;
  company_name: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_budget: number | null;
  account_manager: string | null;
  service_tier: "basic" | "professional" | "enterprise" | "custom" | null;
  contract_notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMonthRow {
  id: number;
  project_id: number;
  report_month: string;
  report_date_range: string | null;
  status: "draft" | "ready";
  views_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  metric_overrides: unknown;
  daily_trend_overrides: unknown;
  weekday_chart_overrides: unknown;
  created_at: string;
  updated_at: string;
}

export interface CsvFileRow {
  id: number;
  project_id: number;
  project_month_id: number | null;
  file_type: string;
  raw_content: string;
  parsed_json: unknown;
  uploaded_at: string;
}

export interface KeywordRowDb {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  avg_cpc: number;
  abs_top_pct: number;
  top_pct: number;
  boost_pct: number;
  sort_order: number;
}
