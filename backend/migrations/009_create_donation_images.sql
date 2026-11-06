-- 009_create_donation_images.sql
-- Optional images attached to a donation (up to 4 per listing).
-- Stores URL references only binary storage is handled externally.

CREATE TABLE IF NOT EXISTS donation_images (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id  UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  alt_text     TEXT,
  display_order SMALLINT   NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_images_donation_id ON donation_images (donation_id);
