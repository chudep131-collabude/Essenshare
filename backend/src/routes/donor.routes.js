/**
 * routes/donor.routes.js
 * Donor profile, location management, and verification routes.
 * All mutations require authenticateToken + requireRole + requireStatus('ACTIVE').
 */

'use strict';

const router = require('express').Router();
const Joi = require('joi');
const { authenticateToken, requireRole, requireStatus } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const { success, created, noContent } = require('../utils/response');
const donorService = require('../services/donor.service');

const DONOR_ROLES = ['INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION'];
// requireStatus guard: block SUSPENDED/BANNED from write operations
const donorActiveGuard = [authenticateToken, requireRole(...DONOR_ROLES), requireStatus('ACTIVE')];
// Read-only guard: still blocks SUSPENDED/BANNED but not for writes
const donorAuthGuard = [authenticateToken, requireRole(...DONOR_ROLES)];

// ── Validation schemas ─────────────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().min(7).max(20).optional(),
  country_code: Joi.string().length(2).uppercase().optional(),
  display_name: Joi.string().min(2).max(100).optional(),
  bio: Joi.string().max(1000).allow('', null).optional(),
  business_name: Joi.string().max(200).allow('', null).optional(),
  business_reg_no: Joi.string().max(100).allow('', null).optional(),
}).min(1);

const addLocationSchema = Joi.object({
  label: Joi.string().min(2).max(100).required(),
  address: Joi.string().min(5).max(500).required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

const updateLocationSchema = Joi.object({
  label: Joi.string().min(2).max(100).optional(),
  address: Joi.string().min(5).max(500).optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const businessVerificationSchema = Joi.object({
  business_name: Joi.string().max(200).optional(),
  business_reg_no: Joi.string().max(100).optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
});

// ── Profile ────────────────────────────────────────────────────────────────────

// GET /api/v1/donors/profile
router.get('/profile', ...donorAuthGuard, async (req, res, next) => {
  try {
    const profile = await donorService.getProfile(req.user.sub);
    return success(res, profile, 'Donor profile retrieved');
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/v1/donors/profile
router.patch('/profile', ...donorActiveGuard, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await donorService.updateProfile(req.user.sub, req.body, req.ip);
    return success(res, profile, 'Donor profile updated');
  } catch (err) {
    return next(err);
  }
});

// ── Pickup history ─────────────────────────────────────────────────────────────

// GET /api/v1/donors/pickups
router.get('/pickups', ...donorAuthGuard, async (req, res, next) => {
  try {
    const Pickup = require('../models/Pickup');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const [pickups, total] = await Promise.all([
      Pickup.findByDonor(req.user.sub, { limit, offset }),
      Pickup.countByDonor(req.user.sub),
    ]);
    return success(res, {
      pickups,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    }, 'Pickup history retrieved');
  } catch (err) {
    return next(err);
  }
});

// ── Pickup locations ──────────────────────────────────────────────────────────

// GET /api/v1/donors/locations
router.get('/locations', ...donorAuthGuard, async (req, res, next) => {
  try {
    const locations = await donorService.listLocations(req.user.sub);
    return success(res, { locations }, 'Locations retrieved');
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/donors/locations
router.post('/locations', ...donorActiveGuard, validateBody(addLocationSchema), async (req, res, next) => {
  try {
    const location = await donorService.addLocation(req.user.sub, req.body, req.ip);
    return created(res, { location }, 'Location added');
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/v1/donors/locations/:id
router.patch('/locations/:id', ...donorActiveGuard, validateBody(updateLocationSchema), async (req, res, next) => {
  try {
    const location = await donorService.updateLocation(req.params.id, req.user.sub, req.body, req.ip);
    return success(res, { location }, 'Location updated');
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/v1/donors/locations/:id
router.delete('/locations/:id', ...donorActiveGuard, async (req, res, next) => {
  try {
    await donorService.deleteLocation(req.params.id, req.user.sub, req.ip);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ── Safety agreement ──────────────────────────────────────────────────────────

// POST /api/v1/donors/safety-agreement
router.post('/safety-agreement', ...donorAuthGuard, async (req, res, next) => {
  try {
    const result = await donorService.acceptSafetyAgreement(req.user.sub, req.ip);
    return success(res, result, 'Safety agreement accepted');
  } catch (err) {
    return next(err);
  }
});

// ── Verification ──────────────────────────────────────────────────────────────

// GET /api/v1/donors/verification
router.get('/verification', ...donorAuthGuard, async (req, res, next) => {
  try {
    const status = await donorService.getVerificationStatus(req.user.sub);
    return success(res, status, 'Verification status retrieved');
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/donors/verification/business
router.post('/verification/business', ...donorAuthGuard, validateBody(businessVerificationSchema), async (req, res, next) => {
  try {
    const result = await donorService.submitBusinessVerification(req.user.sub, req.body, req.ip);
    return created(res, result, 'Business verification submitted');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
