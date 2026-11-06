/**
 * models/ImpactRecord.js
 * Data-access layer for the impact_records table.
 * One record is created per confirmed pickup tracks redistributed quantities and geography.
 * All queries use parameterised placeholders.
 */

'use strict';

const { pool } = require('../config/database');

const ImpactRecord = {
  /**
   * Create a new impact record for a completed pickup.
   * @param {{ pickup_id: string, donation_id: string, donor_user_id: string, category: string,
   *           quantity: number, weight_kg?: number|null, country_code?: string|null, city?: string|null }} opts
   * @returns {Promise<object>} The created row
   */
  async create({
    pickup_id,
    donation_id,
    donor_user_id,
    category,
    quantity,
    weight_kg = null,
    country_code = null,
    city = null,
  }) {
    const result = await pool.query(
      `INSERT INTO impact_records
         (pickup_id, donation_id, donor_user_id, category, quantity, weight_kg, country_code, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [pickup_id, donation_id, donor_user_id, category, quantity, weight_kg, country_code, city]
    );
    return result.rows[0];
  },

  /**
   * Aggregate platform-wide impact statistics.
   * @returns {Promise<{ total_pickups: number, total_weight_kg: number, partner_organisations: number, countries: number }>}
   */
  async getSummary() {
    const [impactRes, orgsRes, countriesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(quantity), 0) AS portions, COALESCE(SUM(weight_kg), 0) AS weight FROM impact_records`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE role = 'ORGANIZATION' AND status = 'ACTIVE' AND deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(DISTINCT country_code) AS count FROM users
         WHERE country_code IS NOT NULL AND deleted_at IS NULL`
      ),
    ]);

    return {
      total_pickups:         parseInt(impactRes.rows[0].count, 10),
      portions_shared:       parseInt(impactRes.rows[0].portions, 10),
      total_weight_kg:       parseFloat(impactRes.rows[0].weight),
      partner_organisations: parseInt(orgsRes.rows[0].count, 10),
      countries:             parseInt(countriesRes.rows[0].count, 10),
    };
  },
};

module.exports = ImpactRecord;
