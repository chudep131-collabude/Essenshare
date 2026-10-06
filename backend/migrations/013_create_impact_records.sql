CREATE TABLE IF NOT EXISTS impact_records (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id     UUID        NOT NULL UNIQUE REFERENCES pickups(id) ON DELETE CASCADE,
  donation_id   UUID        NOT NULL REFERENCES donations(id),
  donor_user_id UUID        NOT NULL REFERENCES users(id),
  category      TEXT        NOT NULL,
  quantity      INTEGER     NOT NULL,
  weight_kg     NUMERIC(8,2),
  country_code  CHAR(2),
  city          TEXT,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_impact_records_donor     ON impact_records(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_impact_records_completed ON impact_records(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_records_category  ON impact_records(category);
CREATE INDEX IF NOT EXISTS idx_impact_records_country   ON impact_records(country_code);
