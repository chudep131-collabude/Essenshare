/**
 * controllers/pickup.controller.js
 * Thin HTTP adapter for the pickup service.
 * Reads cookies via raw header parsing (cookie-parser is not installed).
 * Joi schemas are exported so route files can wire validateBody() middleware.
 */

'use strict';

const Joi = require('joi');
const { created, success } = require('../utils/response');
const pickupService = require('../services/pickup.service');

// ── Cookie helper (no cookie-parser dependency) ───────────────────────────────

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function getSessionToken(req) {
  return (
    req.headers['x-session-token'] ||
    getCookie(req, 'recipient_session')
  );
}

// ── Joi schemas (exported for use with validateBody middleware) ───────────────

const requestPickupSchema = Joi.object({
  donation_id: Joi.string().uuid().required(),
  requested_qty: Joi.number().integer().min(1).max(100).default(1),
  liability_accepted: Joi.boolean().default(true),
});

const verifyCodeSchema = Joi.object({
  code: Joi.string().min(6).max(64).optional(),
  raw_code: Joi.string().min(6).max(64).optional(),
}).or('code', 'raw_code');

const confirmPickupSchema = Joi.object({
  confirmed_qty: Joi.number().integer().min(1).required(),
  confirmed_weight_kg: Joi.number().min(0).optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/pickups/request
 * Public requires a valid recipient_session cookie or x-session-token header.
 * Body is validated by validateBody(requestPickupSchema) at the route level.
 */
async function requestPickup(req, res, next) {
  try {
    const sessionToken = getSessionToken(req);
    const result = await pickupService.requestPickup(req.body, sessionToken, req.ip);
    return created(res, result, 'Pickup request created');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/pickups/verify
 * Donor-authenticated. Returns pickup + donation info for the confirm step.
 * Body is validated by validateBody(verifyCodeSchema) at the route level.
 */
async function verifyCode(req, res, next) {
  try {
    const code = req.body.code || req.body.raw_code;
    const result = await pickupService.verifyCode(code, req.user.sub, req.ip);
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/pickups/:id/confirm
 * Donor-authenticated. Confirms the handover and records impact.
 * Body is validated by validateBody(confirmPickupSchema) at the route level.
 */
async function confirmPickup(req, res, next) {
  try {
    const result = await pickupService.confirmPickup(
      req.params.id,
      req.body,
      req.user.sub,
      req.ip
    );
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/v1/pickups/:id
 * Public requires a valid recipient_session cookie or x-session-token header.
 * Cancels a PENDING pickup and restores the reserved quantity.
 */
async function cancelPickup(req, res, next) {
  try {
    const sessionToken = getSessionToken(req);
    await pickupService.cancelPickup(req.params.id, sessionToken, req.ip);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/pickups/:id/status
 * Public requires a valid recipient_session cookie or x-session-token header.
 * Returns current status fields for the pickup.
 */
async function getPickupStatus(req, res, next) {
  try {
    const sessionToken = getSessionToken(req);
    const result = await pickupService.getPickupStatus(req.params.id, sessionToken);
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  // Schemas (used by route-level validateBody)
  requestPickupSchema,
  verifyCodeSchema,
  confirmPickupSchema,
  // Handlers
  requestPickup,
  verifyCode,
  confirmPickup,
  cancelPickup,
  getPickupStatus,
};
