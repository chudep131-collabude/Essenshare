/**
 * controllers/admin.controller.js
 * Thin HTTP adapter for admin.service.js.
 * Schemas are exported so route files can wire them as middleware.
 * Role enforcement (requireRole('ADMIN')) is done at the route level.
 */
'use strict';

const Joi = require('joi');
const { success } = require('../utils/response');
const adminService = require('../services/admin.service');

// ── Schemas ───────────────────────────────────────────────────────────────────

const USER_ROLES    = ['INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION', 'ADMIN'];
const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'];
const DONATION_STATUSES = ['ACTIVE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'HIDDEN'];

const listUsersQuerySchema = Joi.object({
  role:   Joi.string().valid(...USER_ROLES).optional(),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'DELETED').optional(),
  search: Joi.string().max(100).optional(),
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
});

const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid(...USER_STATUSES).required(),
  reason: Joi.string().max(500).required(),
});

const listDonationsQuerySchema = Joi.object({
  status:   Joi.string().valid(...DONATION_STATUSES).optional(),
  donor_id: Joi.string().uuid().optional(),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(100).default(20),
});

const hideDonationSchema = Joi.object({
  reason: Joi.string().max(500).required(),
});

const listAuditLogsQuerySchema = Joi.object({
  action:  Joi.string().max(100).optional(),
  user_id: Joi.string().uuid().optional(),
  from:    Joi.date().iso().optional(),
  to:      Joi.date().iso().optional(),
  page:    Joi.number().integer().min(1).default(1),
  limit:   Joi.number().integer().min(1).max(100).default(20),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    return success(res, stats, 'Dashboard stats retrieved.');
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const result = await adminService.listUsers(req.query);
    return success(res, result, 'Users retrieved.');
  } catch (err) {
    return next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await adminService.getUser(req.params.id);
    return success(res, user, 'User retrieved.');
  } catch (err) {
    return next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.status,
      req.body.reason,
      req.user.sub,
      req.ip
    );
    return success(res, user, 'User status updated.');
  } catch (err) {
    return next(err);
  }
}

async function listDonations(req, res, next) {
  try {
    const result = await adminService.listDonations(req.query);
    return success(res, result, 'Donations retrieved.');
  } catch (err) {
    return next(err);
  }
}

async function hideDonation(req, res, next) {
  try {
    const donation = await adminService.hideDonation(
      req.params.id,
      req.body.reason,
      req.user.sub,
      req.ip
    );
    return success(res, donation, 'Donation hidden.');
  } catch (err) {
    return next(err);
  }
}

async function reinstateDonation(req, res, next) {
  try {
    const donation = await adminService.reinstateDonation(
      req.params.id,
      req.user.sub,
      req.ip
    );
    return success(res, donation, 'Donation reinstated.');
  } catch (err) {
    return next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const result = await adminService.getAuditLogs(req.query);
    return success(res, result, 'Audit logs retrieved.');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  listUsers,
  getUser,
  updateUserStatus,
  listDonations,
  hideDonation,
  reinstateDonation,
  getAuditLogs,
  // Schemas — consumed by route files
  listUsersQuerySchema,
  updateUserStatusSchema,
  listDonationsQuerySchema,
  hideDonationSchema,
  listAuditLogsQuerySchema,
};
