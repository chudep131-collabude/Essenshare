/**
 * models/Donor.js
 * Data-access methods for the donors table.
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const Donor = {
  /**
   * Create a donor profile row linked to a user.
   * @param {object} fields - { user_id, display_name, bio, business_name, business_reg_no }
   * @returns {Promise<object>}
   */
  async create({ user_id, display_name = null, bio = null, business_name = null, business_reg_no = null }) {
    const result = await pool.query(
      `INSERT INTO donors (user_id, display_name, bio, business_name, business_reg_no)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, display_name, bio, business_name, business_reg_no]
    );
    return result.rows[0];
  },

  /**
   * Find a donor row by the owning user's id.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM donors WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update a donor row by the owning user's id.
   * @param {string} userId
   * @param {object} fields - { display_name, bio, business_name, business_reg_no }
   * @returns {Promise<object|null>}
   */
  async updateByUserId(userId, fields) {
    const allowedFields = ['display_name', 'bio', 'business_name', 'business_reg_no', 'total_weight_kg'];
    const keys = Object.keys(fields).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) return null;

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    setClauses.push('updated_at = NOW()');

    const values = keys.map((k) => fields[k]);
    values.push(userId);

    const sql = `
      UPDATE donors
      SET ${setClauses.join(', ')}
      WHERE user_id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(sql, values);
    return result.rows[0] || null;
  },
};

module.exports = Donor;
