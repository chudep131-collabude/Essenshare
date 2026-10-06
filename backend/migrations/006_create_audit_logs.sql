-- 006_create_audit_logs.sql
-- Immutable audit trail for all state-changing operations.
-- Rows are never updated or deleted.

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  resource   TEXT,
  ip_address TEXT,
  outcome    TEXT        NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
