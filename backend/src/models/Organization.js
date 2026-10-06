/**
 * models/Organization.js
 * Data-access methods for the organizations table.
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const Organization = {
  /**
   * Create an organization profile row linked to a user.
   * @param {object} fields - { user_id, org_name, registration_no, address, website }
   * @returns {Promise<object>}
   */
  async create({ user_id, org_name, registration_no = null, address = null, website = null }) {
    const result = await pool.query(
      `INSERT INTO organizations (user_id, org_name, registration_no, address, website)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, org_name, registration_no, address, website]
    );
    return result.rows[0];
  },

  /**
   * Find an organization row by the owning user's id.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM organizations WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },
};

module.exports = Organization;
