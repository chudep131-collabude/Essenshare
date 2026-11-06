/**
 * routes/impact.routes.js
 * Public impact and transparency statistics routes (Phase 13).
 * Privacy-safe: never returns donor, recipient, or exact coordinate data.
 */

'use strict';

const router = require('express').Router();
const { pool } = require('../config/database');
const { success } = require('../utils/response');

// GET /api/v1/impact/summary
router.get('/summary', async (req, res, next) => {
  try {
    const [impactRes, donorsRes, orgsRes, countriesRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS count,
           COALESCE(SUM(quantity), 0) AS portions,
           COALESCE(SUM(weight_kg), 0) AS weight
         FROM impact_records`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE role IN ('INDIVIDUAL_DONOR', 'BUSINESS_DONOR')
           AND status = 'ACTIVE'
           AND deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE role = 'ORGANIZATION'
           AND status = 'ACTIVE'
           AND deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(DISTINCT country_code) AS count FROM impact_records
         WHERE country_code IS NOT NULL`
      ),
    ]);

    const portions = parseInt(impactRes.rows[0].portions, 10);
    const weight = parseFloat(impactRes.rows[0].weight);

    return success(res, {
      total_pickups:           parseInt(impactRes.rows[0].count, 10),
      portions_shared:         portions,
      total_meals:             portions,
      weight_redistributed_kg: weight,
      total_kg:                weight,
      active_donors:           parseInt(donorsRes.rows[0].count, 10),
      partner_organisations:   parseInt(orgsRes.rows[0].count, 10),
      countries:               parseInt(countriesRes.rows[0].count, 10) || 1,
      last_updated:            new Date().toISOString(),
    }, 'Impact summary retrieved.');
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/impact/by-country
router.get('/by-country', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         country_code,
         COUNT(*) AS total_pickups,
         COALESCE(SUM(quantity), 0) AS total_portions,
         COALESCE(SUM(weight_kg), 0) AS total_kg
       FROM impact_records
       WHERE country_code IS NOT NULL
       GROUP BY country_code
       ORDER BY total_kg DESC`
    );

    const data = result.rows.map(r => ({
      country_code:   r.country_code,
      total_pickups:  parseInt(r.total_pickups, 10),
      total_portions: parseInt(r.total_portions, 10),
      total_kg:       parseFloat(r.total_kg),
    }));

    return success(res, { countries: data }, 'Impact breakdown by country retrieved.');
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/impact/recent
// Returns recent completed pickups with zero identifiable recipient/donor PII
router.get('/recent', async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const result = await pool.query(
      `SELECT
         category,
         city,
         country_code,
         quantity AS portions,
         weight_kg,
         completed_at
       FROM impact_records
       ORDER BY completed_at DESC
       LIMIT $1`,
      [limit]
    );

    return success(res, { recent_pickups: result.rows }, 'Recent completed pickups retrieved.');
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/impact/stats
// Breakdown of impact by category
router.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         category,
         COUNT(*) AS total_pickups,
         COALESCE(SUM(quantity), 0) AS total_portions,
         COALESCE(SUM(weight_kg), 0) AS total_kg
       FROM impact_records
       GROUP BY category
       ORDER BY total_kg DESC`
    );

    return success(res, {
      by_category: result.rows.map(r => ({
        category:       r.category,
        total_pickups:  parseInt(r.total_pickups, 10),
        total_portions: parseInt(r.total_portions, 10),
        total_kg:       parseFloat(r.total_kg),
      })),
    }, 'Impact category statistics retrieved.');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
