-- 015_add_hidden_donation_status.sql
-- Adds HIDDEN to the donations.status CHECK constraint so admin can suppress
-- a donation from public listing without a permanent soft-delete.

ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_status_check;

ALTER TABLE donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IN ('ACTIVE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'HIDDEN'));
