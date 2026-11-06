/**
 * controllers/donation.controller.js
 * Thin HTTP adapter for donation.service.js.
 * Validates input via Joi schemas, calls service, formats responses.
 *
 * No business logic lives here only:
 *  1. Schema validation (exported for route middleware chains)
 *  2. Service call
 *  3. Response formatting
 */

'use strict';

const Joi = require('joi');
const { success, created } = require('../utils/response');
const donationService = require('../services/donation.service');

// ── Joi schemas (exported for route middleware) ───────────────────────────────

const CATEGORIES = [
  'PREPARED_FOOD', 'GROCERIES', 'PRODUCE', 'BAKERY',
  'DAIRY', 'BEVERAGES', 'NON_FOOD_ESSENTIALS', 'OTHER',
];

const QUANTITY_UNITS = ['portions', 'kg', 'litres', 'items', 'boxes', 'bags'];

const createDonationSchema = Joi.object({
  title:          Joi.string().min(3).max(120).required(),
  description:    Joi.string().max(1000).optional(),
  category:       Joi.string().valid(...CATEGORIES).required(),
  quantity:       Joi.number().integer().min(1).max(10000).required(),
  quantity_unit:  Joi.string().valid(...QUANTITY_UNITS).default('portions'),
  weight_kg:      Joi.number().min(0).max(10000).optional(),
  allergens:      Joi.array().items(Joi.string().max(50)).max(20).default([]),
  is_halal:       Joi.boolean().default(false),
  is_vegan:       Joi.boolean().default(false),
  is_vegetarian:  Joi.boolean().default(false),
  pickup_address: Joi.string().min(5).max(500).required(),
  pickup_lat:     Joi.number().min(-90).max(90).required(),
  pickup_lng:     Joi.number().min(-180).max(180).required(),
  pickup_notes:   Joi.string().max(500).optional(),
  available_from: Joi.date().iso().optional(),
  expires_at:     Joi.date().iso().greater('now').optional(),
});

const updateDonationSchema = Joi.object({
  title:          Joi.string().min(3).max(120).optional(),
  description:    Joi.string().max(1000).allow('').optional(),
  category:       Joi.string().valid(...CATEGORIES).optional(),
  quantity:       Joi.number().integer().min(1).max(10000).optional(),
  quantity_unit:  Joi.string().valid(...QUANTITY_UNITS).optional(),
  weight_kg:      Joi.number().min(0).max(10000).allow(null).optional(),
  allergens:      Joi.array().items(Joi.string().max(50)).max(20).optional(),
  is_halal:       Joi.boolean().optional(),
  is_vegan:       Joi.boolean().optional(),
  is_vegetarian:  Joi.boolean().optional(),
  pickup_address: Joi.string().min(5).max(500).optional(),
  pickup_lat:     Joi.number().min(-90).max(90).optional(),
  pickup_lng:     Joi.number().min(-180).max(180).optional(),
  pickup_notes:   Joi.string().max(500).allow('').optional(),
  available_from: Joi.date().iso().optional(),
  expires_at:     Joi.date().iso().greater('now').optional(),
}).min(1); // at least one field required for an update

const listDonationsQuerySchema = Joi.object({
  lat:       Joi.number().min(-90).max(90).optional(),
  lng:       Joi.number().min(-180).max(180).optional(),
  radius_km: Joi.number().min(0.5).max(100).default(10),
  category:  Joi.string().valid(...CATEGORIES).optional(),
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
}).and('lat', 'lng'); // lat and lng must both be present or both absent

const myListingsQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/donations
 * Create a new donation listing. Requires auth + donor role.
 */
async function createDonation(req, res, next) {
  try {
    const result = await donationService.createDonation(
      req.body,
      req.user.sub,
      req.ip
    );
    return created(res, result.donation, 'Donation listed successfully.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/donations
 * List active donations public endpoint.
 * Supports optional lat/lng for proximity search.
 */
async function listDonations(req, res, next) {
  try {
    const result = await donationService.listDonations(req.query);
    return success(res, result, 'Donations retrieved.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/donations/mine
 * List the authenticated donor's own listings (all statuses).
 */
async function listMyDonations(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await donationService.listMyDonations(req.user.sub, {
      page: parseInt(page ?? '1', 10),
      limit: parseInt(limit ?? '20', 10),
    });
    return success(res, result, 'Your donations retrieved.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/donations/:id
 * Get a single donation by ID public endpoint.
 */
async function getDonation(req, res, next) {
  try {
    const result = await donationService.getDonation(req.params.id);
    return success(res, result.donation, 'Donation retrieved.');
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/donations/:id
 * Update a donation. Requires auth + donor role + ownership.
 */
async function updateDonation(req, res, next) {
  try {
    const result = await donationService.updateDonation(
      req.params.id,
      req.body,
      req.user.sub,
      req.ip
    );
    return success(res, result.donation, 'Donation updated.');
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/v1/donations/:id
 * Cancel (soft-delete) a donation. Requires auth + donor role + ownership.
 */
async function deleteDonation(req, res, next) {
  try {
    await donationService.deleteDonation(req.params.id, req.user.sub, req.ip);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/donations/:id/recall
 * Emergency recall of a donation. Requires auth + donor role or admin.
 */
async function recallDonation(req, res, next) {
  try {
    const { reason } = req.body || {};
    const result = await donationService.recallDonation(
      req.params.id,
      reason,
      req.user.sub,
      req.user.role,
      req.ip
    );
    return success(res, result, 'Donation emergency recall broadcasted.');
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/donations/:id/extend
 * Extend donation pickup deadline. Requires auth + donor role + ownership.
 */
async function extendDonation(req, res, next) {
  try {
    const { new_deadline } = req.body;
    const result = await donationService.extendDonation(
      req.params.id,
      new_deadline,
      req.user.sub,
      req.ip
    );
    return success(res, result.donation, 'Donation deadline extended.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/donations/:id/images
 * Get all images for a listing.
 */
async function getDonationImages(req, res, next) {
  try {
    const images = await donationService.getDonationImages(req.params.id);
    return success(res, { images }, 'Donation images retrieved.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/donations/:id/images
 * Add an image reference to a donation.
 */
async function addDonationImage(req, res, next) {
  try {
    const image = await donationService.addDonationImage(
      req.params.id,
      req.body,
      req.user.sub,
      req.ip
    );
    return created(res, { image }, 'Donation image added.');
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/v1/donations/:id/images/:imageId
 * Remove an image reference from a donation.
 */
async function removeDonationImage(req, res, next) {
  try {
    await donationService.removeDonationImage(
      req.params.id,
      req.params.imageId,
      req.user.sub,
      req.ip
    );
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

const extendDonationSchema = Joi.object({
  new_deadline: Joi.date().iso().greater('now').required(),
});

const addImageSchema = Joi.object({
  url: Joi.string().uri().required(),
  alt_text: Joi.string().max(200).allow('', null).optional(),
  display_order: Joi.number().integer().min(0).max(4).optional(),
});

module.exports = {
  // Handlers
  createDonation,
  listDonations,
  listMyDonations,
  getDonation,
  updateDonation,
  deleteDonation,
  recallDonation,
  extendDonation,
  getDonationImages,
  addDonationImage,
  removeDonationImage,
  // Schemas
  createDonationSchema,
  updateDonationSchema,
  listDonationsQuerySchema,
  myListingsQuerySchema,
  extendDonationSchema,
  addImageSchema,
};
