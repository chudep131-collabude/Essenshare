/**
 * services/donation.service.js
 * Business logic for donation lifecycle management.
 * Framework-agnostic — no Express imports.
 *
 * Security rules enforced:
 *  - Ownership verified before any mutation (updateDonation, deleteDonation)
 *  - All DB access via parameterised model methods — no raw query concatenation
 *  - No PII in any log statement
 *  - Errors thrown as { message, code, statusCode } service errors
 */

'use strict';

const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

// Default expiry if none supplied: 24 hours from now
function defaultExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

// ── Public service methods ────────────────────────────────────────────────────

/**
 * Create a new donation listing.
 *
 * @param {object} data - Validated donation fields from controller
 * @param {string} donorUserId - Authenticated user's ID (from JWT)
 * @param {string} ipAddress
 * @returns {Promise<{ donation: object }>}
 */
async function createDonation(data, donorUserId, ipAddress) {
  const {
    title, description, category,
    quantity, quantity_unit, weight_kg,
    allergens, is_halal, is_vegan, is_vegetarian,
    pickup_address, pickup_lat, pickup_lng, pickup_notes,
    available_from, expires_at,
  } = data;

  const donation = await Donation.create({
    donor_user_id: donorUserId,
    title,
    description,
    category,
    quantity,
    quantity_unit,
    weight_kg,
    allergens,
    is_halal,
    is_vegan,
    is_vegetarian,
    pickup_address,
    pickup_lat,
    pickup_lng,
    pickup_notes,
    available_from,
    expires_at: expires_at ?? defaultExpiry(),
  });

  logger.info('donation.service: donation created', { donationId: donation.id, userId: donorUserId });

  await AuditLog.create({
    user_id:    donorUserId,
    action:     'DONATION_CREATED',
    resource:   'donations',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
    meta:       { donation_id: donation.id, category },
  });

  return { donation };
}

/**
 * Get a single donation by ID.
 * Returns only non-deleted donations to the public.
 *
 * @param {string} id
 * @returns {Promise<{ donation: object }>}
 */
async function getDonation(id) {
  const donation = await Donation.findById(id);

  if (!donation || donation.deleted_at) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  return { donation };
}

/**
 * List donations. If lat/lng are provided, returns nearby results sorted by distance.
 * Falls back to newest-first paginated list when no coordinates are given.
 *
 * @param {object} query - Validated query params
 * @returns {Promise<{ donations: object[], total: number, page: number, limit: number }>}
 */
async function listDonations(query) {
  const {
    lat, lng, radius_km = 10,
    page = 1, limit = 20, category,
  } = query;

  const offset = (page - 1) * limit;

  let donations;
  let total;

  if (lat != null && lng != null) {
    donations = await Donation.findNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radius_km),
      limit,
      offset,
      category,
    });
    // For spatial queries, total = returned count (no efficient full count without PostGIS)
    total = donations.length + offset;
  } else {
    [donations, total] = await Promise.all([
      Donation.findActive({ limit, offset, category }),
      Donation.countActive({ category }),
    ]);
  }

  return {
    donations,
    total,
    page,
    limit,
  };
}

/**
 * List a donor's own donation listings (all statuses, not just active).
 *
 * @param {string} donorUserId
 * @param {{ page?: number, limit?: number }} opts
 * @returns {Promise<{ donations: object[], total: number, page: number, limit: number }>}
 */
async function listMyDonations(donorUserId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [donations, total] = await Promise.all([
    Donation.findByDonor(donorUserId, { limit, offset }),
    Donation.countByDonor(donorUserId),
  ]);

  return { donations, total, page, limit };
}

/**
 * Update a donation.
 * Verifies ownership — only the donor who created it can update it.
 * Only ACTIVE donations can be updated.
 *
 * @param {string} id
 * @param {object} updates - Validated fields to update
 * @param {string} donorUserId
 * @param {string} ipAddress
 * @returns {Promise<{ donation: object }>}
 */
async function updateDonation(id, updates, donorUserId, ipAddress) {
  const existing = await Donation.findByIdAndDonor(id, donorUserId);

  if (!existing) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  if (existing.status !== 'ACTIVE') {
    throw serviceError(
      `Cannot update a donation with status "${existing.status}".`,
      'DONATION_NOT_EDITABLE',
      409
    );
  }

  const donation = await Donation.updateById(id, updates);

  logger.info('donation.service: donation updated', { donationId: id, userId: donorUserId });

  await AuditLog.create({
    user_id:    donorUserId,
    action:     'DONATION_UPDATED',
    resource:   'donations',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
    meta:       { donation_id: id },
  });

  return { donation };
}

/**
 * Cancel / soft-delete a donation.
 * Verifies ownership.
 * COMPLETED donations cannot be cancelled.
 *
 * @param {string} id
 * @param {string} donorUserId
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
async function deleteDonation(id, donorUserId, ipAddress) {
  const existing = await Donation.findByIdAndDonor(id, donorUserId);

  if (!existing) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  if (existing.status === 'COMPLETED') {
    throw serviceError(
      'Completed donations cannot be cancelled.',
      'DONATION_COMPLETED',
      409
    );
  }

  await Donation.softDelete(id);

  logger.info('donation.service: donation cancelled', { donationId: id, userId: donorUserId });

  await AuditLog.create({
    user_id:    donorUserId,
    action:     'DONATION_CANCELLED',
    resource:   'donations',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
    meta:       { donation_id: id },
  });
}

module.exports = {
  createDonation,
  getDonation,
  listDonations,
  listMyDonations,
  updateDonation,
  deleteDonation,
};
