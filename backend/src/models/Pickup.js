/**
 * models/Pickup.js
 * Data-access layer for the pickups table.
 * Pickup codes are stored as SHA-256 hashes raw code is attached to the returned row once.
 * All queries use parameterised placeholders.
 */

'use strict';

const crypto = require('crypto');
const { pool } = require('../config/database');

const Pickup = {
  /**
   * Create a new pickup request.
   * Codes expire by donation expiry or default to 24 hours.
   * @param {{ donation_id: string, session_id: string|null, donor_user_id: string, requested_qty?: number, expires_at?: Date|string }} opts
   * @returns {Promise<object>} Row with rawCode attached (returned once, never stored)
   */
  async create({ donation_id, session_id, donor_user_id, requested_qty = 1, expires_at, liability_accepted = true }) {
    const rawCode = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const displayCode = rawCode.slice(0, 8).toUpperCase();
    const expiry = expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO pickups
         (donation_id, session_id, donor_user_id, code_hash, display_code, requested_qty, expires_at, liability_accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [donation_id, session_id, donor_user_id, codeHash, displayCode, requested_qty, expiry, liability_accepted ? new Date() : null]
    );

    const row = result.rows[0];
    row.rawCode = rawCode; // returned once, never stored
    return row;
  },

  /**
   * Find a pickup by its hashed code.
   * @param {string} codeHash SHA-256 hash of the raw pickup code
   * @returns {Promise<object|null>}
   */
  async findByCodeHash(codeHash) {
    const result = await pool.query(
      `SELECT * FROM pickups WHERE code_hash = $1 LIMIT 1`,
      [codeHash]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a pickup by display code or raw code hash.
   * Accepts formatted display codes (e.g. "B4C9-E710"), plain codes ("B4C9E710"), or code hash.
   * @param {string} code
   * @returns {Promise<object|null>}
   */
  async findByCode(code) {
    if (!code) return null;
    const cleanDisplay = String(code).trim().replace(/[-\s]/g, '').toUpperCase();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const result = await pool.query(
      `SELECT * FROM pickups
       WHERE UPPER(REPLACE(display_code, '-', '')) = $1
          OR code_hash = $2
       LIMIT 1`,
      [cleanDisplay, codeHash]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a pickup by its UUID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM pickups WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * List pickups for a donor, newest first, paginated.
   * @param {string} donorUserId
   * @param {{ limit?: number, offset?: number }} opts
   * @returns {Promise<object[]>}
   */
  async findByDonor(donorUserId, { limit = 20, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT * FROM pickups
       WHERE donor_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [donorUserId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Count all pickups for a donor (for pagination metadata).
   * @param {string} donorUserId
   * @returns {Promise<number>}
   */
  async countByDonor(donorUserId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM pickups WHERE donor_user_id = $1`,
      [donorUserId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Mark a pickup as CONFIRMED and record confirmed quantities.
   * @param {{ id: string, confirmed_qty: number, confirmed_weight_kg?: number|null }} opts
   * @returns {Promise<object|null>}
   */
  async confirm({ id, confirmed_qty, confirmed_weight_kg = null }) {
    const result = await pool.query(
      `UPDATE pickups
       SET status = 'CONFIRMED',
           confirmed_at = NOW(),
           confirmed_qty = $2,
           confirmed_weight_kg = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, confirmed_qty, confirmed_weight_kg]
    );
    return result.rows[0] || null;
  },

  /**
   * Mark a pickup as CANCELLED.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async cancel(id) {
    const result = await pool.query(
      `UPDATE pickups
       SET status = 'CANCELLED',
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Expire all PENDING pickups whose expires_at has passed.
   * Called by a scheduled maintenance job.
   * @returns {Promise<number>} Number of rows expired
   */
  async expireStale() {
    const result = await pool.query(
      `UPDATE pickups
       SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'PENDING' AND expires_at <= NOW()`
    );
    return result.rowCount;
  },
};

module.exports = Pickup;
