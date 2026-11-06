-- 005_create_verifications.sql
-- One-time verification codes (email verification, password reset).
-- Only hashes of codes are stored raw codes are never persisted.

CREATE TABLE IF NOT EXISTS verifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
  code_hash  TEXT        NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user_id   ON verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_code_hash ON verifications (code_hash);
CREATE INDEX IF NOT EXISTS idx_verifications_type      ON verifications (type);
CREATE INDEX IF NOT EXISTS idx_verifications_used      ON verifications (used) WHERE used = FALSE;
