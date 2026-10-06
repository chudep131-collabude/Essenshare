CREATE TABLE IF NOT EXISTS cooldowns (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID        NOT NULL REFERENCES recipient_sessions(id) ON DELETE CASCADE,
  donor_user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cooldowns_session_donor ON cooldowns(session_id, donor_user_id);
CREATE INDEX IF NOT EXISTS idx_cooldowns_expires_at    ON cooldowns(expires_at);
