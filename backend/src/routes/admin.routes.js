/**
 * routes/admin.routes.js
 * Admin management routes Phase 5 implementation.
 * All routes require authenticateToken + requireRole('ADMIN') (UPPERCASE matches DB constraint).
 * Middleware order: authenticateToken → requireRole → validateBody/validateQuery → handler.
 */
'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  getDashboard,
  listUsers,
  getUser,
  updateUserStatus,
  listDonations,
  hideDonation,
  reinstateDonation,
  getAuditLogs,
  listVerificationQueue,
  reviewVerificationRequest,
  listOrganizations,
  approveOrganization,
  rejectOrganization,
  removeDonation,
  warnDonor,
  listUsersQuerySchema,
  updateUserStatusSchema,
  listDonationsQuerySchema,
  hideDonationSchema,
  listAuditLogsQuerySchema,
  reviewVerificationSchema,
  reviewOrgSchema,
  removeDonationSchema,
  warnDonorSchema,
} = require('../controllers/admin.controller');
const {
  listReports,
  listReportsQuerySchema,
  resolveReport,
  resolveReportSchema,
} = require('../controllers/report.controller');

// All admin routes share this guard
const adminOnly = [authenticateToken, requireRole('ADMIN')];

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/dashboard
router.get('/dashboard', ...adminOnly, getDashboard);

// ── Verification Queue ────────────────────────────────────────────────────────

// GET /api/v1/admin/verification-queue
router.get('/verification-queue', ...adminOnly, listVerificationQueue);

// PATCH /api/v1/admin/verification-queue/:id
router.patch('/verification-queue/:id', ...adminOnly, validateBody(reviewVerificationSchema), reviewVerificationRequest);

// ── Organization management ───────────────────────────────────────────────────

// GET /api/v1/admin/organizations
router.get('/organizations', ...adminOnly, listOrganizations);

// POST /api/v1/admin/organizations/:id/approve
router.post('/organizations/:id/approve', ...adminOnly, validateBody(reviewOrgSchema), approveOrganization);

// POST /api/v1/admin/organizations/:id/reject
router.post('/organizations/:id/reject', ...adminOnly, validateBody(reviewOrgSchema), rejectOrganization);

// ── User / Donor management ───────────────────────────────────────────────────

// GET /api/v1/admin/users
router.get('/users', ...adminOnly, validateQuery(listUsersQuerySchema), listUsers);

// GET /api/v1/admin/users/:id
router.get('/users/:id', ...adminOnly, getUser);

// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', ...adminOnly, validateBody(updateUserStatusSchema), updateUserStatus);

// POST /api/v1/admin/donors/:id/warn
router.post('/donors/:id/warn', ...adminOnly, validateBody(warnDonorSchema), warnDonor);

// ── Donation moderation ───────────────────────────────────────────────────────

// GET /api/v1/admin/donations
router.get('/donations', ...adminOnly, validateQuery(listDonationsQuerySchema), listDonations);

// POST /api/v1/admin/donations/:id/hide
router.post('/donations/:id/hide', ...adminOnly, validateBody(hideDonationSchema), hideDonation);

// POST /api/v1/admin/donations/:id/reinstate
router.post('/donations/:id/reinstate', ...adminOnly, reinstateDonation);

// POST /api/v1/admin/donations/:id/remove
router.post('/donations/:id/remove', ...adminOnly, validateBody(removeDonationSchema), removeDonation);

// ── Reports (admin dashboard view) ───────────────────────────────────────────
// Full report CRUD lives in reports.routes.js (/api/v1/reports).
// This route provides the same listing and resolving under /api/v1/admin/reports for convenience.

// GET /api/v1/admin/reports
router.get('/reports', ...adminOnly, validateQuery(listReportsQuerySchema), listReports);

// PATCH /api/v1/admin/reports/:id/resolve
router.patch('/reports/:id/resolve', ...adminOnly, validateBody(resolveReportSchema), resolveReport);

// ── Audit logs ────────────────────────────────────────────────────────────────

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', ...adminOnly, validateQuery(listAuditLogsQuerySchema), getAuditLogs);

module.exports = router;
