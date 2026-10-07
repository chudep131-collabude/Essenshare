/**
 * routes/reports.routes.js
 * Safety report routes — Phase 4 implementation.
 * POST / is intentionally unauthenticated (anonymous reports allowed).
 * Middleware order: authenticateToken → requireRole → validateBody/validateQuery → handler.
 */
'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  submitReport,
  listReports,
  resolveReport,
  submitReportSchema,
  listReportsQuerySchema,
  resolveReportSchema,
} = require('../controllers/report.controller');

// POST /api/v1/reports — public (anonymous reports allowed)
router.post(
  '/',
  validateBody(submitReportSchema),
  submitReport
);

// GET /api/v1/reports — ADMIN only
router.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  validateQuery(listReportsQuerySchema),
  listReports
);

// PATCH /api/v1/reports/:id/resolve — ADMIN only
router.patch(
  '/:id/resolve',
  authenticateToken,
  requireRole('ADMIN'),
  validateBody(resolveReportSchema),
  resolveReport
);

module.exports = router;
