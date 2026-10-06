-- 003_create_organizations.sql
-- Extended profile for ORGANIZATION users.

CREATE TABLE IF NOT EXISTS organizations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  org_name        TEXT        NOT NULL,
  registration_no TEXT,
  address         TEXT,
  website         TEXT,
  verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations (user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON organizations (verified);
