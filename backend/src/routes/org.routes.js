/**
 * routes/org.routes.js
 * Organization profile, bulk surplus browsing, and allocation management.
 * All mutations require authenticateToken + requireRole('ORGANIZATION') + requireStatus('ACTIVE').
 */

'use strict';

const router = require('express').Router();
const Joi = require('joi');
const { authenticateToken, requireRole, requireStatus } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const { success, created } = require('../utils/response');
const orgService = require('../services/org.service');

const orgAuthGuard = [authenticateToken, requireRole('ORGANIZATION')];
const orgActiveGuard = [authenticateToken, requireRole('ORGANIZATION'), requireStatus('ACTIVE')];

// ── Validation schemas ─────────────────────────────────────────────────────────

const updateOrgProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().min(7).max(20).optional(),
  country_code: Joi.string().length(2).uppercase().optional(),
  org_name: Joi.string().min(2).max(200).optional(),
  registration_no: Joi.string().max(100).allow('', null).optional(),
  address: Joi.string().max(500).allow('', null).optional(),
  website: Joi.string().uri().allow('', null).optional(),
}).min(1);

const listDonationsQuerySchema = Joi.object({
  category: Joi.string().optional(),
  min_quantity: Joi.number().integer().min(1).default(1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const requestAllocationSchema = Joi.object({
  listing_id: Joi.string().uuid().required(),
  requested_quantity: Joi.number().integer().min(1).required(),
  notes: Joi.string().max(1000).allow('', null).optional(),
});

const listAllocationsQuerySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ── Profile ────────────────────────────────────────────────────────────────────

// GET /api/v1/orgs/profile
router.get('/profile', ...orgAuthGuard, async (req, res, next) => {
  try {
    const profile = await orgService.getProfile(req.user.sub);
    return success(res, profile, 'Organization profile retrieved.');
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/v1/orgs/profile
router.patch('/profile', ...orgActiveGuard, validateBody(updateOrgProfileSchema), async (req, res, next) => {
  try {
    const profile = await orgService.updateProfile(req.user.sub, req.body, req.ip);
    return success(res, profile, 'Organization profile updated.');
  } catch (err) {
    return next(err);
  }
});

// PUT /api/v1/orgs/profile (alias for PATCH)
router.put('/profile', ...orgActiveGuard, validateBody(updateOrgProfileSchema), async (req, res, next) => {
  try {
    const profile = await orgService.updateProfile(req.user.sub, req.body, req.ip);
    return success(res, profile, 'Organization profile updated.');
  } catch (err) {
    return next(err);
  }
});

// ── Surplus Donations ─────────────────────────────────────────────────────────

// GET /api/v1/orgs/donations
router.get('/donations', ...orgAuthGuard, validateQuery(listDonationsQuerySchema), async (req, res, next) => {
  try {
    const result = await orgService.listDonations(req.query);
    return success(res, result, 'Available surplus donations retrieved.');
  } catch (err) {
    return next(err);
  }
});

// ── Allocations ────────────────────────────────────────────────────────────────

// POST /api/v1/orgs/allocations
router.post('/allocations', ...orgActiveGuard, validateBody(requestAllocationSchema), async (req, res, next) => {
  try {
    const allocation = await orgService.requestAllocation(req.user.sub, req.body, req.ip);
    return created(res, { allocation }, 'Surplus allocation requested.');
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/orgs/allocations
router.get('/allocations', ...orgAuthGuard, validateQuery(listAllocationsQuerySchema), async (req, res, next) => {
  try {
    const result = await orgService.listAllocations(req.user.sub, req.query);
    return success(res, result, 'Allocations retrieved.');
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/v1/orgs/allocations/:id
router.delete('/allocations/:id', ...orgActiveGuard, async (req, res, next) => {
  try {
    await orgService.cancelAllocation(req.params.id, req.user.sub, req.ip);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
