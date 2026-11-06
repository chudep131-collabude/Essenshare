/**
 * models/RefreshToken.js
 * Data-access methods for the refresh_tokens table.
 * Only SHA-256 hashes of raw tokens are stored never the raw value.
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const RefreshToken = {
  /**
   * Persist a new hashed refresh token.
   * @param {object} fields - { user_id, token_hash, expires_at, ip_address, user_agent }
   * @returns {Promise<object>}
   */
  async create({ user_id, token_hash, expires_at, ip_address = null, user_agent = null }) {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, token_hash, expires_at, ip_address, user_agent]
    );
    return result.rows[0];
  },

  /**
   * Find an active (non-revoked, non-expired) token record by its hash.
   * @param {string} tokenHash
   * @returns {Promise<object|null>}
   */
  async findByHash(tokenHash) {
    const result = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  /**
   * Revoke a single token by its hash.
   * @param {string} tokenHash
   * @returns {Promise<void>}
   */
  async revoke(tokenHash) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
      [tokenHash]
    );
  },

  /**
   * Revoke all tokens belonging to a user (e.g. on password change or logout-all).
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async revokeAllForUser(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  },
};

module.exports = RefreshToken;
