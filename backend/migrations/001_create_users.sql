-- 001_create_users.sql
-- Core users table shared by all roles.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  role           TEXT        NOT NULL CHECK (role IN ('INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION', 'ADMIN')),
  status         TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED')),
  full_name      TEXT,
  phone          TEXT,
  country_code   CHAR(2),
  email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_country     ON users (country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at  ON users (deleted_at)   WHERE deleted_at IS NOT NULL;
