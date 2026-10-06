CREATE TABLE IF NOT EXISTS pickups (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id         UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  session_id          UUID        REFERENCES recipient_sessions(id) ON DELETE SET NULL,
  code_hash           TEXT        NOT NULL UNIQUE,
  display_code        TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),
  requested_qty       INTEGER     NOT NULL DEFAULT 1,
  confirmed_qty       INTEGER,
  confirmed_weight_kg NUMERIC(8,2),
  expires_at          TIMESTAMPTZ NOT NULL,
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  donor_user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pickups_donation_id   ON pickups(donation_id);
CREATE INDEX IF NOT EXISTS idx_pickups_code_hash     ON pickups(code_hash);
CREATE INDEX IF NOT EXISTS idx_pickups_donor_user_id ON pickups(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status        ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_session_id    ON pickups(session_id);
