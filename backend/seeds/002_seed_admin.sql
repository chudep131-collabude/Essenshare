-- 002_seed_admin.sql
-- Run this manually in production to create the first admin account.
-- Change the email and password hash before running.
INSERT INTO users (email, password_hash, role, status, email_verified, full_name)
VALUES (
  'admin@essenshare.org',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqzneflfuhTs5jIzPNmVKFvXkGxK', -- DevPassword123! CHANGE THIS
  'ADMIN',
  'ACTIVE',
  true,
  'Site Admin'
) ON CONFLICT (email) DO NOTHING;
