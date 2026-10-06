/**
 * routes/donations.routes.js
 * Donation listing and management.
 * All stub routes are now replaced with real implementations.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  createDonation,
  listDonations,
  listMyDonations,
  getDonation,
  updateDonation,
  deleteDonation,
  createDonationSchema,
  updateDonationSchema,
  listDonationsQuerySchema,
  myListingsQuerySchema,
} = require('../controllers/donation.controller');

const DONOR_ROLES = ['INDIVIDUAL_DONOR', 'BUSINESS_DONOR'];

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/v1/donations — list active donations (optional proximity search)
router.get(
  '/',
  validateQuery(listDonationsQuerySchema),
  listDonations
);

// GET /api/v1/donations/mine — donor's own listings (auth required, before /:id)
router.get(
  '/mine',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateQuery(myListingsQuerySchema),
  listMyDonations
);

// GET /api/v1/donations/:id — single donation detail (public)
router.get('/:id', getDonation);

// ── Authenticated donor routes ─────────────────────────────────────────────────

// POST /api/v1/donations — create a donation listing
router.post(
  '/',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateBody(createDonationSchema),
  createDonation
);

// PATCH /api/v1/donations/:id — update own donation
router.patch(
  '/:id',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateBody(updateDonationSchema),
  updateDonation
);

// DELETE /api/v1/donations/:id — cancel (soft-delete) own donation
router.delete(
  '/:id',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  deleteDonation
);

module.exports = router;
