/**
 * models/Donation.js
 * Data-access layer for the donations table.
 * All queries use parameterised placeholders no string concatenation of user input.
 *
 * Spatial search uses a bounding-box pre-filter on lat/lng columns plus
 * a haversine distance formula applied to the filtered set.
 * (PostGIS is not required pure SQL haversine.)
 */

'use strict';

const { pool } = require('../config/database');

// ── Allowlisted fields for updates (prevents mass-assignment) ────────────────
const UPDATABLE_FIELDS = new Set([
  'title', 'description', 'category', 'quantity', 'quantity_unit',
  'weight_kg', 'allergens', 'is_halal', 'is_vegan', 'is_vegetarian',
  'pickup_address', 'pickup_lat', 'pickup_lng', 'pickup_notes',
  'available_from', 'expires_at', 'status', 'completed_at',
  'cancelled_at', 'reserved_by', 'deleted_at',
]);

/**
 * Create a new donation row.
 * @param {object} data
 * @returns {Promise<object>} The created row
 */
async function create(data) {
  const {
    donor_user_id, title, description, category,
    quantity, quantity_unit = 'portions', weight_kg,
    allergens = [], is_halal = false, is_vegan = false, is_vegetarian = false,
    pickup_address, pickup_lat, pickup_lng, pickup_notes,
    available_from, expires_at,
  } = data;

  const result = await pool.query(
    `INSERT INTO donations (
       donor_user_id, title, description, category,
       quantity, quantity_unit, weight_kg,
       allergens, is_halal, is_vegan, is_vegetarian,
       pickup_address, pickup_lat, pickup_lng, pickup_notes,
       available_from, expires_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9, $10, $11,
       $12, $13, $14, $15,
       $16, $17
     ) RETURNING *`,
    [
      donor_user_id, title, description ?? null, category,
      quantity, quantity_unit, weight_kg ?? null,
      allergens, is_halal, is_vegan, is_vegetarian,
      pickup_address, pickup_lat, pickup_lng, pickup_notes ?? null,
      available_from ?? new Date(), expires_at,
    ]
  );
  return result.rows[0];
}

/**
 * Find a donation by its ID.
 * Does not filter on deleted_at callers decide what to do with soft-deleted rows.
 * @param {string} id UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const result = await pool.query(
    'SELECT * FROM donations WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find a donation by ID, verified to belong to the given donor.
 * Returns null if not found OR if the donor doesn't own it.
 * @param {string} id
 * @param {string} donorUserId
 * @returns {Promise<object|null>}
 */
async function findByIdAndDonor(id, donorUserId) {
  const result = await pool.query(
    `SELECT * FROM donations
     WHERE id = $1
       AND donor_user_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [id, donorUserId]
  );
  return result.rows[0] || null;
}

/**
 * List active donations for a donor (their own listings).
 * Paginated, newest first.
 * @param {string} donorUserId
 * @param {{ limit?: number, offset?: number }} opts
 * @returns {Promise<object[]>}
 */
async function findByDonor(donorUserId, { limit = 20, offset = 0 } = {}) {
  const result = await pool.query(
    `SELECT * FROM donations
     WHERE donor_user_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [donorUserId, limit, offset]
  );
  return result.rows;
}

/**
 * Count all non-deleted donations for a donor.
 * @param {string} donorUserId
 * @returns {Promise<number>}
 */
async function countByDonor(donorUserId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM donations
     WHERE donor_user_id = $1 AND deleted_at IS NULL`,
    [donorUserId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Spatial search: find active, non-expired donations within `radiusKm`
 * of the given coordinates. Uses bounding-box pre-filter + haversine.
 *
 * Returns rows sorted by distance ascending, with a computed `distance_km` column.
 *
 * @param {{ lat: number, lng: number, radiusKm?: number, limit?: number, offset?: number, category?: string }} opts
 * @returns {Promise<object[]>}
 */
async function findNearby({
  lat,
  lng,
  radiusKm = 10,
  limit = 50,
  offset = 0,
  category,
}) {
  // Bounding-box deltas (1 degree lat ≈ 111 km)
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

  const params = [
    lat, lng,                          // $1, $2 for haversine
    lat - latDelta, lat + latDelta,    // $3, $4 bounding box lat
    lng - lngDelta, lng + lngDelta,    // $5, $6 bounding box lng
    radiusKm,                          // $7
    limit,                             // $8
    offset,                            // $9
  ];

  let categoryClause = '';
  if (category) {
    params.push(category); // $10
    categoryClause = `AND category = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT * FROM (
       SELECT *,
         (6371 * acos(
           LEAST(1.0, GREATEST(-1.0,
             cos(radians($1)) * cos(radians(pickup_lat))
             * cos(radians(pickup_lng) - radians($2))
             + sin(radians($1)) * sin(radians(pickup_lat))
           ))
         )) AS distance_km
       FROM donations
       WHERE status = 'ACTIVE'
         AND deleted_at IS NULL
         AND expires_at > NOW()
         AND available_from <= NOW()
         AND quantity > 0
         AND pickup_lat BETWEEN $3 AND $4
         AND pickup_lng BETWEEN $5 AND $6
         ${categoryClause}
     ) sub
     WHERE distance_km <= $7
     ORDER BY distance_km ASC
     LIMIT $8 OFFSET $9`,
    params
  );
  return result.rows;
}

/**
 * List all active, non-expired donations. Paginated, newest first.
 * Public endpoint fallback when no coordinates are provided.
 * @param {{ limit?: number, offset?: number, category?: string }} opts
 * @returns {Promise<object[]>}
 */
async function findActive({ limit = 50, offset = 0, category } = {}) {
  const params = [limit, offset];
  let categoryClause = '';
  if (category) {
    params.unshift(category); // becomes $1, shift others up
    categoryClause = `AND category = $1`;
  }

  // Build consistent parameterised query
  if (category) {
    const result = await pool.query(
      `SELECT * FROM donations
       WHERE status = 'ACTIVE'
         AND deleted_at IS NULL
         AND expires_at > NOW()
         AND available_from <= NOW()
         AND quantity > 0
         AND category = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT * FROM donations
     WHERE status = 'ACTIVE'
       AND deleted_at IS NULL
       AND expires_at > NOW()
       AND available_from <= NOW()
       AND quantity > 0
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

/**
 * Count active, non-expired donations (for pagination metadata).
 * @param {{ category?: string }} opts
 * @returns {Promise<number>}
 */
async function countActive({ category } = {}) {
  if (category) {
    const r = await pool.query(
      `SELECT COUNT(*) AS count FROM donations
       WHERE status = 'ACTIVE' AND deleted_at IS NULL
         AND expires_at > NOW() AND available_from <= NOW()
         AND quantity > 0
         AND category = $1`,
      [category]
    );
    return parseInt(r.rows[0].count, 10);
  }
  const r = await pool.query(
    `SELECT COUNT(*) AS count FROM donations
     WHERE status = 'ACTIVE' AND deleted_at IS NULL
       AND expires_at > NOW() AND available_from <= NOW()
       AND quantity > 0`
  );
  return parseInt(r.rows[0].count, 10);
}

/**
 * Update specified fields of a donation by ID.
 * Only allowlisted fields are applied.
 * @param {string} id
 * @param {object} fields - Key/value pairs of fields to update
 * @returns {Promise<object|null>} Updated row or null if not found
 */
async function updateById(id, fields) {
  const entries = Object.entries(fields).filter(([k]) => UPDATABLE_FIELDS.has(k));
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
  setClauses.push(`updated_at = NOW()`);
  const values = entries.map(([, v]) => v);

  const result = await pool.query(
    `UPDATE donations SET ${setClauses.join(', ')}
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

/**
 * Soft-delete a donation (sets deleted_at).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function softDelete(id) {
  const result = await pool.query(
    `UPDATE donations
     SET deleted_at = NOW(), status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Expire all ACTIVE donations whose expires_at has passed.
 * Called by a scheduled job (or on-demand maintenance).
 * @returns {Promise<number>} Number of rows expired
 */
async function expireStale() {
  const result = await pool.query(
    `UPDATE donations
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE status = 'ACTIVE'
       AND expires_at <= NOW()
       AND deleted_at IS NULL`
  );
  return result.rowCount ?? 0;
}

module.exports = {
  create,
  findById,
  findByIdAndDonor,
  findByDonor,
  countByDonor,
  findNearby,
  findActive,
  countActive,
  updateById,
  softDelete,
  expireStale,
};
