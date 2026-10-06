/**
 * routes/impact.routes.js
 * Public impact and statistics routes.
 * GET /summary is implemented with real DB queries.
 * GET /stats remains a Phase 2 stub.
 */

'use strict';

const router = require('express').Router();
const { success } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 2 stub - not yet implemented' };

// GET /api/v1/impact/summary — real aggregate queries
router.get('/summary', async (req, res, next) => {
  try {
    const { pool } = require('../config/database');

    const [pickupsRes, weightRes, orgsRes, countriesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'PICKUP_COMPLETED'`
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_weight_kg), 0) AS total FROM donors`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE role = 'ORGANIZATION'
           AND status = 'ACTIVE'
           AND deleted_at IS NULL`
      ),
      pool.query(
        `SELECT COUNT(DISTINCT country_code) AS count FROM users
         WHERE country_code IS NOT NULL
           AND deleted_at IS NULL`
      ),
    ]);

    return success(res, {
      total_pickups:           parseInt(pickupsRes.rows[0].count, 10),
      weight_redistributed_kg: parseFloat(weightRes.rows[0].total),
      partner_organisations:   parseInt(orgsRes.rows[0].count, 10),
      countries:               parseInt(countriesRes.rows[0].count, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/impact/stats — stub (Phase 3)
router.get('/stats', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Impact stats stub');
});

module.exports = router;
