/**
 * routes/admin.routes.js
 * Admin-only management routes — Phase 1 stubs.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { success } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };
const adminOnly = [authenticateToken, requireRole('admin', 'super_admin')];

// GET /api/v1/admin/users — list all users
router.get('/users', ...adminOnly, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Admin list users stub');
});

// GET /api/v1/admin/reports — list all reports
router.get('/reports', ...adminOnly, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Admin list reports stub');
});

// POST /api/v1/admin/users/:id/suspend — suspend a user
router.post('/users/:id/suspend', ...adminOnly, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Admin suspend user stub');
});

module.exports = router;
