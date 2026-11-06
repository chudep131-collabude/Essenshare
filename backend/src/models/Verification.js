/**
 * models/Verification.js
 * Data-access methods for the verifications table.
 * Only SHA-256 hashes of OTP codes are stored raw codes are never persisted.
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const Verification = {
  /**
   * Create a new verification record.
   * @param {object} fields - { user_id, type, code_hash, expires_at }
   * @returns {Promise<object>}
   */
  async create({ user_id, type, code_hash, expires_at }) {
    const result = await pool.query(
      `INSERT INTO verifications (user_id, type, code_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, type, code_hash, expires_at]
    );
    return result.rows[0];
  },

  /**
   * Find an active (unused, non-expired) verification for a user + type.
   * Used for email verification flows where userId is known.
   * @param {string} userId
   * @param {string} type - 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
   * @returns {Promise<object|null>}
   */
  async findActiveByUserAndType(userId, type) {
    const result = await pool.query(
      `SELECT * FROM verifications
       WHERE user_id = $1
         AND type = $2
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, type]
    );
    return result.rows[0] || null;
  },

  /**
   * Find an active (unused, non-expired) verification by code hash + type.
   * Used for password reset where the userId is not known upfront.
   * @param {string} codeHash
   * @param {string} type
   * @returns {Promise<object|null>}
   */
  async findByHashAndType(codeHash, type) {
    const result = await pool.query(
      `SELECT * FROM verifications
       WHERE code_hash = $1
         AND type = $2
         AND used = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [codeHash, type]
    );
    return result.rows[0] || null;
  },

  /**
   * Mark a verification record as used.
   * @param {string} id - The verification row UUID.
   * @returns {Promise<void>}
   */
  async markUsed(id) {
    await pool.query(
      `UPDATE verifications SET used = TRUE WHERE id = $1`,
      [id]
    );
  },
};

module.exports = Verification;
