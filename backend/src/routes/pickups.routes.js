/**
 * routes/pickups.routes.js
 * Pickup coordination routes — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { success, created } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// POST /api/v1/pickups/request — create pickup request (public)
router.post('/request', (req, res) => {
  return created(res, STUB_PAYLOAD, 'Create pickup request stub');
});

// POST /api/v1/pickups/confirm — confirm handover (auth required)
router.post('/confirm', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Confirm pickup stub');
});

// GET /api/v1/pickups/status/:code — check pickup status by code (public)
router.get('/status/:code', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Pickup status stub');
});

module.exports = router;
