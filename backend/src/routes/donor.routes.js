/**
 * routes/donor.routes.js
 * Donor profile and listing management — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { success, created } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// GET /api/v1/donors/profile — get donor profile (auth required)
router.get('/profile', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Get donor profile stub');
});

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
