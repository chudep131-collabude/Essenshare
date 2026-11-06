# Data Model
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Overview

The database is PostgreSQL with the PostGIS extension enabled for geographic queries.

All timestamps are stored as `TIMESTAMPTZ` (timestamp with time zone) in UTC.  
All IDs are UUIDs (`uuid` type, default `gen_random_uuid()`).  
Soft deletes are used where audit history must be preserved.

---

## 2. Entity Relationship Summary

```
USERS ──────────────────── DONORS (1:1, when role = DONOR)
USERS ──────────────────── ORGANIZATIONS (1:1, when role = ORGANIZATION)
USERS ──────────────────── ADMINS (1:1, when role = ADMIN/SUPER_ADMIN)

DONORS ─────────────────── PICKUP_LOCATIONS (1:many)
DONORS ─────────────────── DONATION_LISTINGS (1:many)
DONORS ─────────────────── TRUST_HISTORY (1:many)

DONATION_LISTINGS ──────── DONATION_ITEMS (1:many)
DONATION_LISTINGS ──────── PICKUP_TRANSACTIONS (1:many)

PICKUP_TRANSACTIONS ────── PICKUP_ITEMS (1:many)
PICKUP_TRANSACTIONS ────── PICKUP_CODES (1:1)
PICKUP_TRANSACTIONS ────── IMPACT_RECORDS (1:1)

USERS ──────────────────── VERIFICATIONS (1:many)
USERS ──────────────────── REPORTS (1:many, as reporter or subject)
DONATION_LISTINGS ──────── REPORTS (1:many)

USERS ──────────────────── NOTIFICATIONS (1:many)
USERS/SYSTEM ───────────── AUDIT_LOGS (1:many)

RECIPIENT_SESSIONS ──────── PICKUP_TRANSACTIONS (1:many)
RECIPIENT_SESSIONS ──────── COOLDOWNS (1:many)
```

---

## 3. Table Definitions

### 3.1 users

The central identity table for all authenticated accounts.

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(320) NOT NULL UNIQUE,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  phone             VARCHAR(20),                    -- E.164 format
  phone_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  password_hash     VARCHAR(255) NOT NULL,
  role              VARCHAR(30) NOT NULL,            -- INDIVIDUAL_DONOR | BUSINESS_DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN
  status            VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING | ACTIVE | WARNED | SUSPENDED | BANNED | DELETED
  language_code     VARCHAR(10) NOT NULL DEFAULT 'en',
  country_code      VARCHAR(2),                     -- ISO 3166-1 alpha-2
  timezone          VARCHAR(50),                    -- IANA timezone string
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                     -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### 3.2 user_auth_tokens

Refresh token management.

```sql
CREATE TABLE user_auth_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 of the refresh token
  device_hint   VARCHAR(255),                  -- user agent snippet for display
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON user_auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_hash ON user_auth_tokens(token_hash);
```

### 3.3 verification_otps

OTP codes for email/phone verification and password reset.

```sql
CREATE TABLE verification_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,   -- EMAIL_VERIFY | PHONE_VERIFY | PASSWORD_RESET
  code_hash   VARCHAR(255) NOT NULL,  -- SHA-256 of the OTP/token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otps_user_id ON verification_otps(user_id);
```

### 3.4 donors

Extended profile for donor accounts.

```sql
CREATE TABLE donors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  donor_type            VARCHAR(20) NOT NULL,   -- INDIVIDUAL | BUSINESS | ORGANIZATION_DONOR
  display_name          VARCHAR(255) NOT NULL,  -- public name shown on listings
  -- Individual fields
  first_name            VARCHAR(100),
  last_name             VARCHAR(100),
  -- Business/Org fields
  business_name         VARCHAR(255),
  business_category     VARCHAR(50),            -- RESTAURANT | BAKERY | GROCERY | FARM | MANUFACTURER | WHOLESALER | OTHER
  contact_person_name   VARCHAR(200),
  website_url           VARCHAR(500),
  social_profile_url    VARCHAR(500),
  -- Verification
  verification_level    VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING | CONTACT_VERIFIED | LOCATION_VERIFIED | BUSINESS_VERIFIED | TRUSTED_DONOR
  trust_score           SMALLINT NOT NULL DEFAULT 50,            -- 0-100
  -- Safety agreement
  safety_agreement_accepted_at    TIMESTAMPTZ,
  safety_agreement_version        VARCHAR(20),
  -- Metadata
  total_pickups_completed         INTEGER NOT NULL DEFAULT 0,
  total_items_donated             NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donors_user_id ON donors(user_id);
CREATE INDEX idx_donors_verification_level ON donors(verification_level);
CREATE INDEX idx_donors_trust_score ON donors(trust_score);
```

### 3.5 organizations

Extended profile for distribution partner accounts.

```sql
CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  org_name              VARCHAR(255) NOT NULL,
  org_type              VARCHAR(50) NOT NULL,   -- FOOD_BANK | SHELTER | NGO | SCHOOL | RELIGIOUS_ORG | DISASTER_RELIEF | COMMUNITY_ORG | OTHER
  contact_person_name   VARCHAR(200) NOT NULL,
  contact_role          VARCHAR(100),
  website_url           VARCHAR(500),
  description           TEXT,
  service_area          VARCHAR(500),           -- free text description of coverage area
  people_served_weekly  INTEGER,
  country_code          VARCHAR(2),
  region                VARCHAR(100),
  status                VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING | UNDER_REVIEW | APPROVED | ACTIVE | SUSPENDED
  approved_at           TIMESTAMPTZ,
  approved_by           UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_country ON organizations(country_code);
```

### 3.6 pickup_locations

Physical pickup locations for donors (one donor may have multiple).

```sql
CREATE TABLE pickup_locations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id            UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  label               VARCHAR(100),              -- e.g. "Main Branch", "Warehouse"
  address_line1       VARCHAR(255) NOT NULL,
  address_line2       VARCHAR(255),
  city                VARCHAR(100) NOT NULL,
  state_region        VARCHAR(100),
  postal_code         VARCHAR(20),
  country_code        VARCHAR(2) NOT NULL,
  coordinates         GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS geographic point
  lat                 NUMERIC(9,6) NOT NULL,   -- stored separately for non-PostGIS queries
  lng                 NUMERIC(9,6) NOT NULL,
  pickup_instructions TEXT,
  landmark_notes      TEXT,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  -- Hours: stored as JSON array of {day: 0-6, open: "HH:MM", close: "HH:MM"}
  operating_hours     JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pickup_locations_donor_id ON pickup_locations(donor_id);
CREATE INDEX idx_pickup_locations_geo ON pickup_locations USING GIST(coordinates);
CREATE INDEX idx_pickup_locations_country ON pickup_locations(country_code);
```

### 3.7 donation_listings

The core listing entity representing available surplus.

```sql
CREATE TABLE donation_listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id              UUID NOT NULL REFERENCES donors(id),
  pickup_location_id    UUID NOT NULL REFERENCES pickup_locations(id),
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  category              VARCHAR(50) NOT NULL,  -- PREPARED_MEALS | BAKED_GOODS | FRESH_PRODUCE | PACKAGED_FOOD | DAIRY | MEAT_FISH | BEVERAGES | BABY_FOOD | PERSONAL_HYGIENE | BABY_SUPPLIES | CLOTHING | HOUSEHOLD | AGRICULTURAL | EMERGENCY_RATIONS | OTHER
  is_food               BOOLEAN NOT NULL DEFAULT TRUE,
  status                VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',  -- DRAFT | PENDING_REVIEW | ACTIVE | LOW_STOCK | CLAIMED | EXPIRED | REMOVED | HIDDEN_PENDING_REVIEW
  -- Inventory
  total_quantity        NUMERIC(10,2) NOT NULL,
  remaining_quantity    NUMERIC(10,2) NOT NULL,
  reserved_quantity     NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit                  VARCHAR(30) NOT NULL,   -- kg | portions | boxes | items | litres | meals | packs
  -- Food-specific fields (nullable for non-food)
  prepared_at           TIMESTAMPTZ,
  use_by_date           TIMESTAMPTZ,
  storage_requirement   VARCHAR(30),           -- ROOM_TEMP | REFRIGERATED | FROZEN
  allergens             TEXT[],               -- array of allergen strings
  ingredients           TEXT,
  condition             VARCHAR(30),           -- FRESHLY_MADE | DAY_OLD | NEAR_EXPIRY | FROZEN_SURPLUS
  -- Timing
  available_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pickup_deadline       TIMESTAMPTZ NOT NULL,
  special_instructions  TEXT,
  -- Emergency flag
  emergency_flag        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Geo (denormalized from pickup location for efficient search)
  coordinates           GEOGRAPHY(POINT, 4326),
  country_code          VARCHAR(2),
  -- Photo references (stored as array of storage paths)
  photos                TEXT[],
  -- Metrics
  view_count            INTEGER NOT NULL DEFAULT 0,
  pickup_count          INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at            TIMESTAMPTZ,
  removed_at            TIMESTAMPTZ,
  removed_reason        TEXT,

  CONSTRAINT chk_quantity_non_negative CHECK (remaining_quantity >= 0),
  CONSTRAINT chk_reserved_non_negative CHECK (reserved_quantity >= 0),
  CONSTRAINT chk_remaining_lte_total CHECK (remaining_quantity <= total_quantity),
  CONSTRAINT chk_pickup_deadline_future CHECK (pickup_deadline > created_at)
);

CREATE INDEX idx_listings_donor_id ON donation_listings(donor_id);
CREATE INDEX idx_listings_status ON donation_listings(status);
CREATE INDEX idx_listings_category ON donation_listings(category);
CREATE INDEX idx_listings_pickup_deadline ON donation_listings(pickup_deadline);
CREATE INDEX idx_listings_geo ON donation_listings USING GIST(coordinates);
CREATE INDEX idx_listings_country ON donation_listings(country_code);
CREATE INDEX idx_listings_emergency ON donation_listings(emergency_flag) WHERE emergency_flag = TRUE;
```

### 3.8 donation_items

Individual items within a donation listing.

```sql
CREATE TABLE donation_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES donation_listings(id) ON DELETE CASCADE,
  item_name       VARCHAR(255) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL,
  unit            VARCHAR(30) NOT NULL,
  -- Impact calculation helpers
  weight_kg       NUMERIC(8,3),         -- weight per unit in kg (optional)
  meals_per_unit  NUMERIC(6,2),         -- estimated meals per unit (optional)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_item_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_items_listing_id ON donation_items(listing_id);
```

### 3.9 recipient_sessions

Anonymous session tracking for recipients (no personal data stored).

```sql
CREATE TABLE recipient_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Fingerprint for cooldown tracking (non-reversible hash of device signals)
  session_token   VARCHAR(255) NOT NULL UNIQUE,  -- random, stored in cookie
  -- Contact for notification (optional, provided voluntarily)
  notify_email    VARCHAR(320),                   -- masked in logs; nullable
  -- No GPS coordinates stored
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL  -- session TTL: 24 hours
);

CREATE INDEX idx_recipient_sessions_token ON recipient_sessions(session_token);
```

### 3.10 pickup_transactions

Records each pickup event from code issuance through completion.

```sql
CREATE TABLE pickup_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES donation_listings(id),
  donor_id              UUID NOT NULL REFERENCES donors(id),
  recipient_session_id  UUID NOT NULL REFERENCES recipient_sessions(id),
  -- Organization pickup (if applicable)
  org_id                UUID REFERENCES organizations(id),
  status                VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  -- PENDING | CODE_ISSUED | ARRIVED | CONFIRMED | COMPLETED | CANCELLED | EXPIRED
  -- Quantities
  requested_quantity    NUMERIC(10,2),
  confirmed_quantity    NUMERIC(10,2),          -- set on COMPLETED
  -- Timestamps
  code_issued_at        TIMESTAMPTZ,
  arrived_at            TIMESTAMPTZ,
  confirmed_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   VARCHAR(255),
  -- Cooldown
  cooldown_starts_at    TIMESTAMPTZ,            -- set on COMPLETED
  cooldown_expires_at   TIMESTAMPTZ,            -- cooldown_starts_at + 4 hours
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_listing_id ON pickup_transactions(listing_id);
CREATE INDEX idx_transactions_donor_id ON pickup_transactions(donor_id);
CREATE INDEX idx_transactions_recipient ON pickup_transactions(recipient_session_id);
CREATE INDEX idx_transactions_status ON pickup_transactions(status);
CREATE INDEX idx_transactions_completed_at ON pickup_transactions(completed_at);
```

### 3.11 pickup_codes

Single-use tokens issued to recipients.

```sql
CREATE TABLE pickup_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL UNIQUE REFERENCES pickup_transactions(id) ON DELETE CASCADE,
  code_hash       VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 of the token
  display_code    VARCHAR(20) NOT NULL UNIQUE,   -- short human-readable code
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | USED | EXPIRED | CANCELLED
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pickup_codes_hash ON pickup_codes(code_hash);
CREATE INDEX idx_pickup_codes_display ON pickup_codes(display_code);
CREATE INDEX idx_pickup_codes_status ON pickup_codes(status);
CREATE INDEX idx_pickup_codes_expires ON pickup_codes(expires_at);
```

### 3.12 pickup_items

Actual items confirmed during handover (may differ from listing items).

```sql
CREATE TABLE pickup_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES pickup_transactions(id) ON DELETE CASCADE,
  item_name       VARCHAR(255) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL,
  unit            VARCHAR(30) NOT NULL,
  weight_kg       NUMERIC(8,3),
  meals_per_unit  NUMERIC(6,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pickup_item_qty_positive CHECK (quantity > 0)
);

CREATE INDEX idx_pickup_items_transaction ON pickup_items(transaction_id);
```

### 3.13 cooldowns

Tracks 4-hour same-donor cooldowns per recipient session.

```sql
CREATE TABLE cooldowns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_session_id  UUID NOT NULL REFERENCES recipient_sessions(id),
  donor_id              UUID NOT NULL REFERENCES donors(id),
  transaction_id        UUID NOT NULL REFERENCES pickup_transactions(id),
  started_at            TIMESTAMPTZ NOT NULL,
  expires_at            TIMESTAMPTZ NOT NULL,   -- started_at + 4 hours

  CONSTRAINT uq_cooldown_session_donor UNIQUE (recipient_session_id, donor_id, started_at)
);

CREATE INDEX idx_cooldowns_session_donor ON cooldowns(recipient_session_id, donor_id);
CREATE INDEX idx_cooldowns_expires ON cooldowns(expires_at);
```

### 3.14 verifications

Records verification events for donors and organizations.

```sql
CREATE TABLE verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,   -- EMAIL | PHONE | BUSINESS_AUTO | BUSINESS_MANUAL | LOCATION | TRUSTED_LEVEL
  status          VARCHAR(20) NOT NULL,   -- PENDING | PASSED | FAILED | MANUAL_REQUIRED
  method          VARCHAR(50),            -- OTP | DOMAIN_MATCH | ADMIN_REVIEW | GOOGLE_MAPS | SOCIAL_PROFILE
  notes           TEXT,                   -- admin notes (not shown to user)
  performed_by    UUID REFERENCES users(id),  -- admin user ID if manual
  performed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verifications_user_id ON verifications(user_id);
CREATE INDEX idx_verifications_type ON verifications(type);
CREATE INDEX idx_verifications_status ON verifications(status);
```

### 3.15 reports

Safety and misconduct reports.

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES donation_listings(id),
  donor_id        UUID REFERENCES donors(id),       -- donor being reported
  reporter_session UUID REFERENCES recipient_sessions(id),  -- for anonymous recipients
  reporter_user   UUID REFERENCES users(id),                 -- for authenticated reporters
  category        VARCHAR(50) NOT NULL,  -- UNSAFE_FOOD | SPOILED_OR_EXPIRED | WRONG_DESCRIPTION | ALREADY_GONE | DONOR_MISCONDUCT | HARASSMENT | OTHER
  severity        VARCHAR(20) NOT NULL,  -- CRITICAL | HIGH | MEDIUM | LOW
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN | UNDER_REVIEW | RESOLVED | DISMISSED
  action_taken    VARCHAR(50),           -- HIDDEN | REMOVED | WARNED | SUSPENDED | NO_ACTION
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_listing_id ON reports(listing_id);
CREATE INDEX idx_reports_donor_id ON reports(donor_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
```

### 3.16 trust_history

Immutable trust score event log for donors.

```sql
CREATE TABLE trust_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id    UUID NOT NULL REFERENCES donors(id),
  event_type  VARCHAR(50) NOT NULL,   -- PICKUP_COMPLETED | REPORT_RECEIVED | WARNING_ISSUED | SUSPENSION | REINSTATEMENT | TRUSTED_LEVEL_GRANTED | TRUSTED_LEVEL_REMOVED
  delta       SMALLINT NOT NULL,      -- positive or negative change to trust score
  score_after SMALLINT NOT NULL,      -- trust score after this event
  reason      TEXT,
  admin_id    UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trust_history_donor_id ON trust_history(donor_id);
```

### 3.17 notifications

Outbound notification records.

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),      -- null for recipient notifications
  recipient_email VARCHAR(320),                   -- for recipient or pre-account notifications
  type            VARCHAR(50) NOT NULL,           -- EMAIL_VERIFY | PICKUP_CONFIRMED | LISTING_EXPIRED | WARNING_ISSUED | etc.
  channel         VARCHAR(20) NOT NULL,           -- EMAIL | SMS | PUSH
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED | SKIPPED
  subject         VARCHAR(255),
  body_template   VARCHAR(100),                   -- template name reference
  payload         JSONB,                          -- template variables (no secrets, no PII beyond email)
  sent_at         TIMESTAMPTZ,
  failed_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### 3.18 audit_logs

Immutable platform-wide event log.

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES users(id),      -- null for system events
  actor_role      VARCHAR(30),
  action          VARCHAR(100) NOT NULL,           -- e.g. LISTING_REMOVED | DONOR_SUSPENDED | CODE_USED | REPORT_RESOLVED
  entity_type     VARCHAR(50),                     -- e.g. DONATION_LISTING | USER | PICKUP_TRANSACTION
  entity_id       UUID,
  details         JSONB,                           -- action-specific context (no PII, no secrets)
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Audit logs are NEVER deleted or updated
-- Enforce via DB-level REVOKE DELETE ON audit_logs FROM app_user;
-- Enforce via DB-level REVOKE UPDATE ON audit_logs FROM app_user;
```

### 3.19 impact_records

Write-once impact tracking derived from completed transactions.

```sql
CREATE TABLE impact_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID NOT NULL UNIQUE REFERENCES pickup_transactions(id),
  donor_id          UUID NOT NULL REFERENCES donors(id),
  org_id            UUID REFERENCES organizations(id),
  country_code      VARCHAR(2),
  city              VARCHAR(100),
  total_items       NUMERIC(10,2) NOT NULL,
  total_weight_kg   NUMERIC(10,3),
  total_meals       NUMERIC(10,2),
  category          VARCHAR(50),
  completed_at      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impact_transaction ON impact_records(transaction_id);
CREATE INDEX idx_impact_donor ON impact_records(donor_id);
CREATE INDEX idx_impact_country ON impact_records(country_code);
CREATE INDEX idx_impact_completed ON impact_records(completed_at);
```

### 3.20 platform_settings

Key-value store for configurable platform parameters.

```sql
CREATE TABLE platform_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Default settings:
| Key | Default Value | Description |
|-----|--------------|-------------|
| `pickup_code_expiry_minutes` | `60` | Pickup code validity window |
| `same_donor_cooldown_hours` | `4` | Cooldown period after same-donor pickup |
| `low_stock_threshold_pct` | `20` | % below which listing shows LOW_STOCK |
| `max_listing_duration_days` | `7` | Default max listing lifetime if no deadline |
| `auto_hide_critical_reports` | `true` | Auto-hide listing on CRITICAL report |
| `business_first_review_count` | `3` | Number of first listings held for review |
| `emergency_mode_active` | `false` | Global emergency mode flag |
| `emergency_mode_regions` | `[]` | JSON array of active emergency region codes |

---

## 4. Database Constraints and Integrity

### 4.1 Application-Level Rules Enforced at DB Level
- `remaining_quantity >= 0` inventory never negative (CHECK constraint)
- `reserved_quantity >= 0` reservations never negative (CHECK constraint)
- `remaining_quantity <= total_quantity` remaining never exceeds total (CHECK constraint)
- `email` uniqueness DB UNIQUE constraint
- `phone` uniqueness DB UNIQUE constraint where not null
- `pickup_codes.code_hash` uniqueness DB UNIQUE constraint
- `pickup_codes.display_code` uniqueness DB UNIQUE constraint
- `impact_records.transaction_id` uniqueness each transaction generates exactly one impact record

### 4.2 Atomic Inventory Updates

Any operation that changes `remaining_quantity` or `reserved_quantity` on `donation_listings` must:
1. Use a database transaction (`BEGIN ... COMMIT`)
2. Select the listing with `FOR UPDATE` to acquire a row lock
3. Validate the quantity will not go below zero before updating
4. Create/update the `pickup_transaction` record in the same transaction
5. Commit releasing the lock

This prevents race conditions when two recipients attempt to claim the last inventory simultaneously.

### 4.3 Foreign Key Strategy
- `ON DELETE CASCADE` for child records that have no independent meaning (e.g. pickup_codes → transactions).
- `ON DELETE RESTRICT` for records that must be preserved for audit (e.g. audit_logs → users).
- `ON DELETE SET NULL` where the reference is optional (e.g. reports.reporter_user → users).

---

## 5. Geographic Queries

Using PostGIS for nearby search:

```sql
-- Find listings within 5km of a given point
SELECT
  dl.id,
  dl.title,
  dl.category,
  dl.remaining_quantity,
  dl.unit,
  dl.pickup_deadline,
  ST_Distance(dl.coordinates::geography, ST_MakePoint(:lng, :lat)::geography) AS distance_meters
FROM donation_listings dl
WHERE
  dl.status IN ('ACTIVE', 'LOW_STOCK')
  AND dl.pickup_deadline > NOW()
  AND ST_DWithin(
    dl.coordinates::geography,
    ST_MakePoint(:lng, :lat)::geography,
    :radius_meters  -- e.g. 5000 for 5km
  )
ORDER BY distance_meters ASC
LIMIT :limit OFFSET :offset;
```

---

## 6. Indexes Strategy Summary

| Table | Index | Reason |
|-------|-------|--------|
| users | email | Login lookup |
| donation_listings | coordinates (GIST) | Geo proximity search |
| donation_listings | status, pickup_deadline | Active listing queries |
| donation_listings | donor_id | Donor's own listings |
| pickup_transactions | status | Dashboard queries |
| pickup_transactions | completed_at | Impact reporting |
| pickup_codes | code_hash | Token validation |
| cooldowns | recipient_session_id, donor_id | Cooldown check on code issuance |
| audit_logs | created_at | Time-based log queries |
| impact_records | country_code, completed_at | Geographic impact reporting |
