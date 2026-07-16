-- One-shot setup for shared contract logo library (run in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS client_logos (
  id BIGSERIAL PRIMARY KEY,
  label TEXT,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL DEFAULT 0,
  storage_backend TEXT NOT NULL DEFAULT 'database',
  content_base64 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_logos
  DROP CONSTRAINT IF EXISTS client_logos_storage_backend_check;

ALTER TABLE client_logos
  ADD CONSTRAINT client_logos_storage_backend_check
  CHECK (storage_backend IN ('local', 'supabase', 'database'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS logo_id BIGINT REFERENCES client_logos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_logo_id ON projects(logo_id);

ALTER TABLE client_logos
  ADD COLUMN IF NOT EXISTS content_base64 TEXT;
