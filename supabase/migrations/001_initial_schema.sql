-- DW VIEWS initial schema for Supabase PostgreSQL

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  campaign_name TEXT NOT NULL,
  report_month TEXT NOT NULL,
  report_date_range TEXT,
  date_range_start TEXT,
  date_range_end TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_months (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_month TEXT NOT NULL,
  report_date_range TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  views_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  metric_overrides JSONB,
  daily_trend_overrides JSONB,
  weekday_chart_overrides JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, report_month)
);

CREATE TABLE project_csv_files (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_month_id BIGINT REFERENCES project_months(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('01', '02', '03', '04', '05', '06')),
  raw_content TEXT NOT NULL,
  parsed_json JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_month_id, file_type)
);

CREATE TABLE project_keyword_rows (
  id BIGSERIAL PRIMARY KEY,
  project_month_id BIGINT NOT NULL REFERENCES project_months(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  avg_cpc REAL NOT NULL DEFAULT 0,
  abs_top_pct REAL NOT NULL DEFAULT 0,
  top_pct REAL NOT NULL DEFAULT 0,
  boost_pct REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_month_id, keyword)
);

CREATE INDEX idx_project_months_project_id ON project_months(project_id);
CREATE INDEX idx_project_csv_files_month_id ON project_csv_files(project_month_id);
CREATE INDEX idx_project_keyword_rows_month_id ON project_keyword_rows(project_month_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_months_updated_at
  BEFORE UPDATE ON project_months
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
