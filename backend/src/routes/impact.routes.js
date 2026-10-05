/**
 * routes/impact.routes.js
 * Public impact and statistics routes — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { success } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// GET /api/v1/impact/summary — public impact summary
router.get('/summary', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Impact summary stub');
});

// GET /api/v1/impact/stats — public statistics
router.get('/stats', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Impact stats stub');
});

module.exports = router;
