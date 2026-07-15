-- Monthly SEM Search Engine Result screenshots for Views clients

CREATE TABLE project_sem_screenshots (
  id BIGSERIAL PRIMARY KEY,
  project_month_id BIGINT NOT NULL REFERENCES project_months(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  image_data TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by BIGINT REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_sem_screenshots_month_id
  ON project_sem_screenshots(project_month_id, sort_order, id);
