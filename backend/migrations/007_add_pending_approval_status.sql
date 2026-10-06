-- 007_add_pending_approval_status.sql
-- Adds PENDING_APPROVAL to the users.status CHECK constraint.
-- Required by the verifyEmail() service path for ORGANIZATION role users,
-- which sets status = 'PENDING_APPROVAL' after email verification so that
-- an admin can approve the organisation before it becomes ACTIVE.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_APPROVAL'));
