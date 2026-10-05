/**
 * routes/reports.routes.js
 * Safety/incident report routes — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { success, created } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// POST /api/v1/reports — submit a report (public — no auth per spec)
router.post('/', (req, res) => {
  return created(res, STUB_PAYLOAD, 'Submit report stub');
});

// GET /api/v1/reports — list reports (auth + admin required)
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), (req, res) => {
  return success(res, STUB_PAYLOAD, 'List reports stub');
});

module.exports = router;
