-- Client account & contract metadata on projects

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS account_manager TEXT,
  ADD COLUMN IF NOT EXISTS service_tier TEXT CHECK (
    service_tier IS NULL OR service_tier IN ('basic', 'professional', 'enterprise', 'custom')
  ),
  ADD COLUMN IF NOT EXISTS contract_notes TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
