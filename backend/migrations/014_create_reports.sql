-- 014_create_reports.sql
-- Safety reports submitted by recipients against donations.
-- Status lifecycle: OPEN → REVIEWING → RESOLVED | DISMISSED
-- auto_hidden = TRUE causes the donation to be hidden immediately on submission

CREATE TABLE IF NOT EXISTS reports (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id          UUID        REFERENCES donations(id) ON DELETE SET NULL,
  reporter_session_id  UUID        REFERENCES recipient_sessions(id) ON DELETE SET NULL,
  category             TEXT        NOT NULL
    CHECK (category IN (
      'UNSAFE_FOOD', 'SPOILED_OR_EXPIRED', 'WRONG_ALLERGEN_INFO',
      'WRONG_DESCRIPTION', 'COLD_CHAIN_CONCERN', 'ALREADY_GONE',
      'DONOR_MISCONDUCT', 'OTHER'
    )),
  description          TEXT,
  status               TEXT        NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  severity             TEXT        NOT NULL DEFAULT 'LOW'
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  auto_hidden          BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at          TIMESTAMPTZ,
  resolution_notes     TEXT,
  ip_address           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_donation_id ON reports(donation_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity    ON reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_created_at  ON reports(created_at DESC);
