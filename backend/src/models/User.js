/**
 * models/User.js
 * Data-access methods for the users table.
 * All queries use parameterised placeholders ($1, $2, ...).
 * No PII is logged — only user_id values appear in log output.
 */

'use strict';

const { pool } = require('../config/database');

const User = {
  /**
   * Find a user by email address.
   * Returns the full row (including password_hash) for authentication checks.
   * Callers must never log the returned object directly.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by primary key UUID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Insert a new user row.
   * @param {object} fields - { email, password_hash, role, full_name, phone, country_code }
   * @returns {Promise<object>} The created row.
   */
  async create({ email, password_hash, role, full_name = null, phone = null, country_code = null }) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, country_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, password_hash, role, full_name, phone, country_code]
    );
    return result.rows[0];
  },

  /**
   * Update arbitrary fields on a user row by id.
   * Dynamically builds the SET clause from the provided keys.
   * Always appends updated_at = NOW().
   * @param {string} id
   * @param {object} fields - Key/value pairs to update (no user-input key names).
   * @returns {Promise<object|null>} The updated row.
   */
  async updateById(id, fields) {
    const allowedFields = ['full_name', 'phone', 'country_code', 'status', 'email_verified', 'password_hash'];
    const keys = Object.keys(fields).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) return null;

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    setClauses.push(`updated_at = NOW()`);

    const values = keys.map((k) => fields[k]);
    values.push(id);

    const sql = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(sql, values);
    return result.rows[0] || null;
  },

  /**
   * Mark a user's email as verified and set status to ACTIVE.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async markEmailVerified(id) {
    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE, status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = User;
