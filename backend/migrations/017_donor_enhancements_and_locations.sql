-- 017_donor_enhancements_and_locations.sql
-- Adds missing tables and columns for donor locations, verification requests,
-- notifications, org allocations, and donor safety agreement metadata.

-- 1. Enhance donors table with safety agreement, verification level, and trust score
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS safety_agreement_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safety_agreement_version TEXT,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 100;

-- 2. Create pickup_locations table
CREATE TABLE IF NOT EXISTS pickup_locations (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT        NOT NULL,
  address      TEXT        NOT NULL,
  lat          NUMERIC(10, 7) NOT NULL,
  lng          NUMERIC(10, 7) NOT NULL,
  notes        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pickup_locations_user_id ON pickup_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_pickup_locations_active  ON pickup_locations(is_active) WHERE deleted_at IS NULL;

-- 3. Add pickup_location_id to donations table
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS pickup_location_id UUID REFERENCES pickup_locations(id) ON DELETE SET NULL;

-- 4. Update donations status check to include LOW_STOCK
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_status_check;

ALTER TABLE donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IN ('ACTIVE', 'LOW_STOCK', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'HIDDEN', 'RECALLED'));

-- 5. Create verification_requests table (for manual business & org verification workflow)
CREATE TABLE IF NOT EXISTS verification_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes        TEXT,
  metadata     JSONB,
  reviewed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user   ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_type   ON verification_requests(type);

-- 6. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications(created_at DESC);

-- 7. Create org_allocations table
CREATE TABLE IF NOT EXISTS org_allocations (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  donation_id        UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  requested_quantity INTEGER     NOT NULL CHECK (requested_quantity > 0),
  status             TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_allocations_org      ON org_allocations(org_user_id);
CREATE INDEX IF NOT EXISTS idx_org_allocations_donation ON org_allocations(donation_id);
CREATE INDEX IF NOT EXISTS idx_org_allocations_status   ON org_allocations(status);
