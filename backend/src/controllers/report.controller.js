/**
 * controllers/report.controller.js
 * Thin HTTP adapter for report.service.js.
 * Schemas are exported so route files can wire them as middleware.
 */
'use strict';

const Joi = require('joi');
const { created, success } = require('../utils/response');
const reportService = require('../services/report.service');

// ── Schemas ───────────────────────────────────────────────────────────────────

const REPORT_CATEGORIES = [
  'UNSAFE_FOOD', 'SPOILED_OR_EXPIRED', 'WRONG_ALLERGEN_INFO',
  'WRONG_DESCRIPTION', 'COLD_CHAIN_CONCERN', 'ALREADY_GONE',
  'DONOR_MISCONDUCT', 'OTHER',
];

const submitReportSchema = Joi.object({
  donation_id: Joi.string().uuid().required(),
  category:    Joi.string().valid(...REPORT_CATEGORIES).required(),
  description: Joi.string().max(500).optional(),
});

const resolveReportSchema = Joi.object({
  status:           Joi.string().valid('RESOLVED', 'DISMISSED').required(),
  resolution_notes: Joi.string().max(1000).optional(),
  restore_donation: Joi.boolean().default(false),
});

const listReportsQuerySchema = Joi.object({
  status:   Joi.string().valid('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED').optional(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(100).default(20),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/reports
 * Public — no authentication required.
 */
async function submitReport(req, res, next) {
  try {
    const result = await reportService.submitReport(
      req.body,
      req.headers['x-session-token'] || null,
      req.ip
    );
    return created(res, result, 'Report submitted.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/reports
 * ADMIN only — enforced in route file.
 */
async function listReports(req, res, next) {
  try {
    const result = await reportService.listReports(req.query);
    return success(res, result, 'Reports retrieved.');
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/reports/:id/resolve
 * ADMIN only — enforced in route file.
 */
async function resolveReport(req, res, next) {
  try {
    const report = await reportService.resolveReport(
      req.params.id,
      req.body,
      req.user.sub,
      req.ip
    );
    return success(res, report, 'Report updated.');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  submitReport,
  listReports,
  resolveReport,
  // Schemas — consumed by route files
  submitReportSchema,
  resolveReportSchema,
  listReportsQuerySchema,
};
