#!/usr/bin/env tsx
/**
 * One-time migration: SQLite → Supabase
 * Usage: npx tsx scripts/migrate-sqlite-to-supabase.ts
 *
 * Requires: better-sqlite3 (install temporarily) + Supabase env vars
 */
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "dw-views.db");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sqlite = new Database(dbPath);
const supabase = createClient(url, key);

async function migrate() {
  console.log("Migrating users...");
  const users = sqlite.prepare("SELECT * FROM users").all() as Record<string, unknown>[];
  for (const u of users) {
    const { error } = await supabase.from("users").upsert({
      id: u.id,
      username: u.username,
      email: u.email,
      password_hash: u.password_hash,
      role: u.role,
      display_name: u.display_name,
      is_active: u.is_active === 1,
      created_at: u.created_at,
      updated_at: u.updated_at,
    });
    if (error) console.error("User error:", error.message);
  }

  console.log("Migrating projects...");
  const projects = sqlite.prepare("SELECT * FROM projects").all() as Record<string, unknown>[];
  for (const p of projects) {
    const { error } = await supabase.from("projects").upsert({
      id: p.id,
      name: p.name,
      slug: p.slug,
      campaign_name: p.campaign_name,
      report_month: p.report_month,
      report_date_range: p.report_date_range,
      date_range_start: p.date_range_start,
      date_range_end: p.date_range_end,
      status: p.status,
      created_by: p.created_by,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });
    if (error) console.error("Project error:", error.message);
  }

  console.log("Migrating project_months...");
  const months = sqlite.prepare("SELECT * FROM project_months").all() as Record<string, unknown>[];
  for (const m of months) {
    const parseJson = (v: unknown) => {
      if (!v) return null;
      if (typeof v === "string") {
        try { return JSON.parse(v); } catch { return null; }
      }
      return v;
    };
    const { error } = await supabase.from("project_months").upsert({
      id: m.id,
      project_id: m.project_id,
      report_month: m.report_month,
      report_date_range: m.report_date_range,
      status: m.status,
      views_approved: m.views_approved === 1,
      approved_by: m.approved_by,
      approved_at: m.approved_at,
      metric_overrides: parseJson(m.metric_overrides),
      daily_trend_overrides: parseJson(m.daily_trend_overrides),
      weekday_chart_overrides: parseJson(m.weekday_chart_overrides),
      created_at: m.created_at,
      updated_at: m.updated_at,
    });
    if (error) console.error("Month error:", error.message);
  }

  console.log("Migrating CSV files...");
  const csvs = sqlite.prepare("SELECT * FROM project_csv_files").all() as Record<string, unknown>[];
  for (const c of csvs) {
    const { error } = await supabase.from("project_csv_files").upsert({
      id: c.id,
      project_id: c.project_id,
      project_month_id: c.project_month_id,
      file_type: c.file_type,
      raw_content: c.raw_content,
      parsed_json: c.parsed_json ? JSON.parse(c.parsed_json as string) : null,
      uploaded_at: c.uploaded_at,
    });
    if (error) console.error("CSV error:", error.message);
  }

  console.log("Migrating keyword rows...");
  const keywords = sqlite.prepare("SELECT * FROM project_keyword_rows").all() as Record<string, unknown>[];
  for (const k of keywords) {
    const { error } = await supabase.from("project_keyword_rows").upsert({
      id: k.id,
      project_month_id: k.project_month_id,
      keyword: k.keyword,
      impressions: k.impressions,
      clicks: k.clicks,
      ctr: k.ctr,
      cost: k.cost,
      avg_cpc: k.avg_cpc,
      abs_top_pct: k.abs_top_pct,
      top_pct: k.top_pct,
      boost_pct: k.boost_pct ?? 0,
      sort_order: k.sort_order,
      created_at: k.created_at,
    });
    if (error) console.error("Keyword error:", error.message);
  }

  console.log("✅ Migration complete");
  sqlite.close();
}

migrate().catch(console.error);
