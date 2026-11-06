/**
 * routes/donations.routes.js
 * Donation listing and management.
 * All stub routes are now replaced with real implementations.
 */

'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole, requireStatus } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
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
  createDonationSchema,
  updateDonationSchema,
  listDonationsQuerySchema,
  myListingsQuerySchema,
  extendDonationSchema,
  addImageSchema,
} = require('../controllers/donation.controller');

const DONOR_ROLES = ['INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION'];
const donorActiveGuard = [authenticateToken, requireRole(...DONOR_ROLES), requireStatus('ACTIVE')];

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/v1/donations list active donations (optional proximity search)
router.get(
  '/',
  validateQuery(listDonationsQuerySchema),
  listDonations
);

// GET /api/v1/donations/nearby dedicated named nearby proximity search
router.get(
  '/nearby',
  validateQuery(listDonationsQuerySchema),
  listDonations
);

// GET /api/v1/donations/mine donor's own listings (auth required, before /:id)
router.get(
  '/mine',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateQuery(myListingsQuerySchema),
  listMyDonations
);

// GET /api/v1/donations/:id single donation detail (public)
router.get('/:id', getDonation);

// GET /api/v1/donations/:id/images listing images (public)
router.get('/:id/images', getDonationImages);

// ── Authenticated donor routes ─────────────────────────────────────────────────

// POST /api/v1/donations create a donation listing
router.post(
  '/',
  ...donorActiveGuard,
  validateBody(createDonationSchema),
  createDonation
);

// PATCH /api/v1/donations/:id update own donation
router.patch(
  '/:id',
  ...donorActiveGuard,
  validateBody(updateDonationSchema),
  updateDonation
);

// PATCH /api/v1/donations/:id/extend extend own donation deadline
router.patch(
  '/:id/extend',
  ...donorActiveGuard,
  validateBody(extendDonationSchema),
  extendDonation
);

// POST /api/v1/donations/:id/images attach an image
router.post(
  '/:id/images',
  ...donorActiveGuard,
  validateBody(addImageSchema),
  addDonationImage
);

// DELETE /api/v1/donations/:id/images/:imageId remove an image
router.delete(
  '/:id/images/:imageId',
  ...donorActiveGuard,
  removeDonationImage
);

// DELETE /api/v1/donations/:id cancel (soft-delete) own donation
router.delete(
  '/:id',
  ...donorActiveGuard,
  deleteDonation
);

// POST /api/v1/donations/:id/recall emergency recall own donation or admin
router.post(
  '/:id/recall',
  authenticateToken,
  requireRole(...DONOR_ROLES, 'ADMIN'),
  recallDonation
);

module.exports = router;
