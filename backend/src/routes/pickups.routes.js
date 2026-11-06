/**
 * routes/pickups.routes.js
 * Pickup coordination routes Phase 3b implementation.
 *
 * POST   /request      public (recipient_session cookie)
 * POST   /verify       donor auth
 * POST   /:id/confirm  donor auth
 * DELETE /:id          public (recipient_session cookie)
 * GET    /:id/status   public (recipient_session cookie)
 */

'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const pickupController = require('../controllers/pickup.controller');

const DONOR_ROLES = ['INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION'];

// POST /api/v1/pickups/request public (SESSION cookie)
router.post(
  '/request',
  validateBody(pickupController.requestPickupSchema),
  pickupController.requestPickup
);

// POST /api/v1/pickups/verify DONOR auth required
router.post(
  '/verify',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateBody(pickupController.verifyCodeSchema),
  pickupController.verifyCode
);

// POST /api/v1/pickups/:id/confirm DONOR auth required
router.post(
  '/:id/confirm',
  authenticateToken,
  requireRole(...DONOR_ROLES),
  validateBody(pickupController.confirmPickupSchema),
  pickupController.confirmPickup
);

// DELETE /api/v1/pickups/:id SESSION cookie (recipient cancels)
router.delete(
  '/:id',
  pickupController.cancelPickup
);

// GET /api/v1/pickups/:id/status SESSION cookie
router.get(
  '/:id/status',
  pickupController.getPickupStatus
);

module.exports = router;
