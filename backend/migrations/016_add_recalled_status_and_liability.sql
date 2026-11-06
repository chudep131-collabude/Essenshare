-- 016_add_recalled_status_and_liability.sql
-- Adds RECALLED to donations and pickups status constraints for emergency food safety recalls.
-- Adds liability_accepted_at to pickups to record Good Samaritan legal acknowledgment.

-- 1. Update donations status check
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_status_check;

ALTER TABLE donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IN ('ACTIVE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'HIDDEN', 'RECALLED'));

-- 2. Update pickups status check
ALTER TABLE pickups
  DROP CONSTRAINT IF EXISTS pickups_status_check;

ALTER TABLE pickups
  ADD CONSTRAINT pickups_status_check
  CHECK (status IN ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'RECALLED'));

-- 3. Add liability_accepted_at to pickups
ALTER TABLE pickups
  ADD COLUMN IF NOT EXISTS liability_accepted_at TIMESTAMPTZ DEFAULT NOW();
