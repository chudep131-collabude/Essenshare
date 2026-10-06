-- 002_create_donors.sql
-- Extended profile for INDIVIDUAL_DONOR and BUSINESS_DONOR users.

CREATE TABLE IF NOT EXISTS donors (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name     TEXT,
  bio              TEXT,
  business_name    TEXT,
  business_reg_no  TEXT,
  total_weight_kg  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donors_user_id ON donors (user_id);
