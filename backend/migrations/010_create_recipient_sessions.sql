CREATE TABLE IF NOT EXISTS recipient_sessions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token_hash  TEXT        NOT NULL UNIQUE,
  ip_address          TEXT,
  user_agent          TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recipient_sessions_token_hash ON recipient_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_recipient_sessions_expires_at ON recipient_sessions(expires_at);
