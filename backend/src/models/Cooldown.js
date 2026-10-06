/**
 * models/Cooldown.js
 * Prevents a recipient session from requesting again from the same donor
 * within the cooldown window (4 hours).
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const Cooldown = {
  /**
   * Create a 4-hour cooldown for a session/donor pair.
   * @param {{ session_id: string, donor_user_id: string }} opts
   * @returns {Promise<object>} The created row
   */
  async create({ session_id, donor_user_id }) {
    const result = await pool.query(
      `INSERT INTO cooldowns (session_id, donor_user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '4 hours')
       RETURNING *`,
      [session_id, donor_user_id]
    );
    return result.rows[0];
  },

  /**
   * Check whether an active cooldown exists for a session/donor pair.
   * @param {string} session_id
   * @param {string} donor_user_id
   * @returns {Promise<boolean>}
   */
  async hasActive(session_id, donor_user_id) {
    const result = await pool.query(
      `SELECT 1 FROM cooldowns
       WHERE session_id = $1
         AND donor_user_id = $2
         AND expires_at > NOW()
       LIMIT 1`,
      [session_id, donor_user_id]
    );
    return result.rows.length > 0;
  },
};

module.exports = Cooldown;
