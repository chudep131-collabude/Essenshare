/**
 * routes/donor.routes.js
 * Donor profile and listing management.
 * GET /profile is implemented with a real DB query.
 * Other routes remain as Phase 2 stubs pending Phase 3.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { success, created, serverError } = require('../utils/response');
const { pool } = require('../config/database');

const STUB_PAYLOAD = { phase: 'Phase 2 stub - not yet implemented' };

// GET /api/v1/donors/profile — returns merged user + donor profile
router.get(
  '/profile',
  authenticateToken,
  requireRole('INDIVIDUAL_DONOR', 'BUSINESS_DONOR'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
           u.id,
           u.role,
           u.status,
           u.full_name,
           u.phone,
           u.country_code,
           u.email_verified,
           u.created_at,
           d.display_name,
           d.bio,
           d.business_name,
           d.business_reg_no,
           d.total_weight_kg
         FROM users u
         LEFT JOIN donors d ON d.user_id = u.id
         WHERE u.id = $1
           AND u.deleted_at IS NULL
         LIMIT 1`,
        [req.user.sub]
      );

      if (!result.rows[0]) {
        return require('../utils/response').notFound(res, 'Donor profile not found');
      }

      return success(res, result.rows[0], 'Donor profile retrieved');
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/v1/donors/profile — update donor profile (auth required)
router.put('/profile', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Update donor profile stub');
});

// GET /api/v1/donors/listings — get donor's listings (auth required)
router.get('/listings', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Get donor listings stub');
});

// POST /api/v1/donors/locations — add donor location (auth required)
router.post('/locations', authenticateToken, (req, res) => {
  return created(res, STUB_PAYLOAD, 'Add donor location stub');
});

module.exports = router;
