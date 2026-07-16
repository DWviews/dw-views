-- Store logo bytes in DB so all contracts can share logos without Supabase Storage.

ALTER TABLE client_logos
  ADD COLUMN IF NOT EXISTS content_base64 TEXT;

ALTER TABLE client_logos
  DROP CONSTRAINT IF EXISTS client_logos_storage_backend_check;

ALTER TABLE client_logos
  ADD CONSTRAINT client_logos_storage_backend_check
  CHECK (storage_backend IN ('local', 'supabase', 'database'));
