-- 001_seed_dev.sql
-- Development seed data. Safe to run multiple times (idempotent).
-- DO NOT run in production — use 002_seed_admin.sql instead.

BEGIN;

-- ── Users ──────────────────────────────────────────────────────────────────
INSERT INTO users (email, password_hash, role, full_name, status, email_verified)
VALUES
  (
    'donor@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqzneflfuhTs5jIzPNmVKFvXkGxK',
    'INDIVIDUAL_DONOR',
    'Alex Donor',
    'ACTIVE',
    true
  ),
  (
    'business@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqzneflfuhTs5jIzPNmVKFvXkGxK',
    'BUSINESS_DONOR',
    'Greenleaf Bakery',
    'ACTIVE',
    true
  ),
  (
    'admin@essenshare.org',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqzneflfuhTs5jIzPNmVKFvXkGxK',
    'ADMIN',
    'Site Admin',
    'ACTIVE',
    true
  )
ON CONFLICT (email) DO NOTHING;

-- ── Donations ──────────────────────────────────────────────────────────────
-- 5 donations from the two donor users, covering all key categories.
INSERT INTO donations (
  donor_user_id,
  title,
  description,
  category,
  quantity,
  quantity_unit,
  status,
  pickup_address,
  pickup_lat,
  pickup_lng,
  expires_at
)
VALUES
  (
    (SELECT id FROM users WHERE email = 'business@example.com'),
    'Freshly Baked Sourdough Loaves',
    'End-of-day sourdough bread — still fresh, perfect for families.',
    'BAKERY',
    120,
    'items',
    'ACTIVE',
    '14 Bakery Lane, Shoreditch, London E1 6RF',
    51.5227,
    -0.0702,
    NOW() + INTERVAL '48 hours'
  ),
  (
    (SELECT id FROM users WHERE email = 'donor@example.com'),
    'Mixed Grocery Bundle',
    'Tinned goods, pasta, and cereals approaching best-before date.',
    'GROCERIES',
    200,
    'bags',
    'ACTIVE',
    '7 High Street, Hackney, London E8 1LQ',
    51.5450,
    -0.0553,
    NOW() + INTERVAL '48 hours'
  ),
  (
    (SELECT id FROM users WHERE email = 'business@example.com'),
    'Seasonal Vegetable Box',
    'Surplus courgettes, peppers, and tomatoes from this week''s delivery.',
    'PRODUCE',
    300,
    'kg',
    'ACTIVE',
    '22 Market Road, Islington, London N7 9PL',
    51.5540,
    -0.1115,
    NOW() + INTERVAL '48 hours'
  ),
  (
    (SELECT id FROM users WHERE email = 'business@example.com'),
    'Hot Lentil Soup Portions',
    'Freshly prepared lentil soup in sealed containers, ready to eat.',
    'PREPARED_FOOD',
    50,
    'portions',
    'ACTIVE',
    '5 Commercial Street, Whitechapel, London E1 6LF',
    51.5175,
    -0.0708,
    NOW() + INTERVAL '48 hours'
  ),
  (
    (SELECT id FROM users WHERE email = 'donor@example.com'),
    'Household Essentials Bag',
    'Surplus toiletries and cleaning supplies in good condition.',
    'OTHER',
    500,
    'items',
    'ACTIVE',
    '33 Kingsland Road, Dalston, London E2 8DA',
    51.5376,
    -0.0760,
    NOW() + INTERVAL '48 hours'
  );

-- ── Impact Record ──────────────────────────────────────────────────────────
-- Simulate one completed pickup cycle:
-- 1. Mark one donation as COMPLETED.
-- 2. Insert a matching pickup row (CONFIRMED).
-- 3. Insert the impact_record referencing that pickup.

UPDATE donations
SET status = 'COMPLETED', completed_at = NOW() - INTERVAL '2 hours'
WHERE title = 'Freshly Baked Sourdough Loaves'
  AND donor_user_id = (SELECT id FROM users WHERE email = 'business@example.com');

INSERT INTO pickups (
  donation_id,
  code_hash,
  display_code,
  status,
  requested_qty,
  confirmed_qty,
  confirmed_weight_kg,
  expires_at,
  confirmed_at,
  donor_user_id
)
SELECT
  d.id,
  md5('seed-pickup-sourdough'),        -- deterministic hash so re-runs are idempotent
  'SEED01',
  'CONFIRMED',
  80,
  80,
  40.00,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '2 hours',
  d.donor_user_id
FROM donations d
WHERE d.title = 'Freshly Baked Sourdough Loaves'
  AND d.donor_user_id = (SELECT id FROM users WHERE email = 'business@example.com')
ON CONFLICT (code_hash) DO NOTHING;

INSERT INTO impact_records (
  pickup_id,
  donation_id,
  donor_user_id,
  category,
  quantity,
  weight_kg,
  country_code,
  city,
  completed_at
)
SELECT
  p.id,
  p.donation_id,
  p.donor_user_id,
  d.category,
  p.confirmed_qty,
  p.confirmed_weight_kg,
  'GB',
  'London',
  p.confirmed_at
FROM pickups p
JOIN donations d ON d.id = p.donation_id
WHERE p.code_hash = md5('seed-pickup-sourdough')
ON CONFLICT (pickup_id) DO NOTHING;

COMMIT;
