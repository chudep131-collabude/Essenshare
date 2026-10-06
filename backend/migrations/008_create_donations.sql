-- 008_create_donations.sql
-- Core donations table.
-- A donation is a surplus resource offered by a donor.
-- Status lifecycle: ACTIVE → RESERVED → COMPLETED | EXPIRED | CANCELLED

CREATE TABLE IF NOT EXISTS donations (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT          NOT NULL,
  description      TEXT,
  category         TEXT          NOT NULL
    CHECK (category IN (
      'PREPARED_FOOD', 'GROCERIES', 'PRODUCE', 'BAKERY',
      'DAIRY', 'BEVERAGES', 'NON_FOOD_ESSENTIALS', 'OTHER'
    )),
  quantity         INTEGER       NOT NULL CHECK (quantity > 0),
  quantity_unit    TEXT          NOT NULL DEFAULT 'portions'
    CHECK (quantity_unit IN ('portions', 'kg', 'litres', 'items', 'boxes', 'bags')),
  weight_kg        NUMERIC(8, 2),
  allergens        TEXT[],
  is_halal         BOOLEAN       NOT NULL DEFAULT FALSE,
  is_vegan         BOOLEAN       NOT NULL DEFAULT FALSE,
  is_vegetarian    BOOLEAN       NOT NULL DEFAULT FALSE,
  status           TEXT          NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  pickup_address   TEXT          NOT NULL,
  pickup_lat       NUMERIC(10, 7) NOT NULL,
  pickup_lng       NUMERIC(10, 7) NOT NULL,
  pickup_notes     TEXT,
  available_from   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ   NOT NULL,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  reserved_by      UUID          REFERENCES users(id) ON DELETE SET NULL,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for the two primary access patterns:
-- 1. Spatial search: nearby active donations sorted by distance
-- 2. Donor's own listings
CREATE INDEX IF NOT EXISTS idx_donations_status           ON donations (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id    ON donations (donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_expires_at       ON donations (expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_donations_pickup_coords    ON donations (pickup_lat, pickup_lng) WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donations_category         ON donations (category) WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donations_created_at       ON donations (created_at DESC);
