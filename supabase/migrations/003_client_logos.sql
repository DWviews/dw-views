-- Reusable client logo library (file-backed, not base64 in API payloads)

CREATE TABLE client_logos (
  id BIGSERIAL PRIMARY KEY,
  label TEXT,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL DEFAULT 0,
  storage_backend TEXT NOT NULL DEFAULT 'local' CHECK (storage_backend IN ('local', 'supabase')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS logo_id BIGINT REFERENCES client_logos(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_logo_id ON projects(logo_id);
