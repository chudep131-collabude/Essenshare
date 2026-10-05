/**
 * routes/org.routes.js
 * Organisation profile routes — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { success, created } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// GET /api/v1/orgs/profile — get org profile (auth required)
router.get('/profile', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Get org profile stub');
});

// PUT /api/v1/orgs/profile — update org profile (auth required)
router.put('/profile', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Update org profile stub');
});

// POST /api/v1/orgs/register — register an organisation (public)
router.post('/register', (req, res) => {
  return created(res, STUB_PAYLOAD, 'Register org stub');
});

module.exports = router;
