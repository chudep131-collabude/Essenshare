/**
 * routes/donations.routes.js
 * Donation listing and management — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { success, created } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// GET /api/v1/donations — list donations (public)
router.get('/', (req, res) => {
  return success(res, STUB_PAYLOAD, 'List donations stub');
});

// POST /api/v1/donations — create donation (auth required)
router.post('/', authenticateToken, (req, res) => {
  return created(res, STUB_PAYLOAD, 'Create donation stub');
});

// GET /api/v1/donations/:id — single donation (public)
router.get('/:id', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Get donation stub');
});

// PATCH /api/v1/donations/:id — update donation (auth required)
router.patch('/:id', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Update donation stub');
});

// DELETE /api/v1/donations/:id — delete donation (auth required)
router.delete('/:id', authenticateToken, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Delete donation stub');
});

module.exports = router;
