/**
 * services/donation.service.js
 * Business logic for donation lifecycle management.
 * Framework-agnostic no Express imports.
 *
 * Security rules enforced:
 *  - Ownership verified before any mutation (updateDonation, deleteDonation)
 *  - All DB access via parameterised model methods no raw query concatenation
 *  - No PII in any log statement
 *  - Errors thrown as { message, code, statusCode } service errors
 */

'use strict';

const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');
const { pool } = require('../config/database');
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
 * Verifies ownership only the donor who created it can update it.
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

/**
 * Emergency Food Safety Recall for a donation.
 * Allowed for the donation owner or an ADMIN.
 * Sets status to 'RECALLED', updates all PENDING pickups to 'RECALLED',
 * and records an urgent safety audit log.
 */
async function recallDonation(id, reason, userId, userRole, ipAddress) {
  const existing = await Donation.findById(id);
  if (!existing || existing.deleted_at) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  const isOwner = existing.donor_user_id === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw serviceError('You do not have permission to recall this donation.', 'FORBIDDEN', 403);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark donation as RECALLED
    await client.query(
      `UPDATE donations
       SET status = 'RECALLED',
           pickup_notes = CONCAT('EMERGENCY RECALL: ', $1::text),
           updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Food safety alert', id]
    );

    // 2. Mark any active pending pickups as RECALLED
    const cancelledPickups = await client.query(
      `UPDATE pickups
       SET status = 'RECALLED',
           updated_at = NOW()
       WHERE donation_id = $1
         AND status = 'PENDING'
       RETURNING id, session_id`,
      [id]
    );

    await client.query('COMMIT');

    // Audit log
    AuditLog.create({
      user_id: userId,
      action: 'DONATION_EMERGENCY_RECALLED',
      resource: 'donations',
      ip_address: ipAddress,
      outcome: 'SUCCESS',
      meta: {
        donation_id: id,
        reason,
        affected_pickups_count: cancelledPickups.rowCount,
      },
    });

    return {
      success: true,
      donation_id: id,
      recalled_pickups: cancelledPickups.rowCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Extend pickup deadline for an existing listing.
 */
async function extendDonation(id, newDeadline, donorUserId, ipAddress) {
  const existing = await Donation.findByIdAndDonor(id, donorUserId);
  if (!existing) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }
  if (['COMPLETED', 'CANCELLED', 'RECALLED'].includes(existing.status)) {
    throw serviceError(
      `Cannot extend a donation with status ${existing.status}.`,
      'DONATION_NOT_EXTENDABLE',
      409
    );
  }
  const deadlineDate = new Date(newDeadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
    throw serviceError('New deadline must be in the future.', 'INVALID_DEADLINE', 400);
  }

  // Restore status to ACTIVE if previously EXPIRED
  const newStatus = existing.status === 'EXPIRED' ? 'ACTIVE' : existing.status;

  const result = await pool.query(
    `UPDATE donations
     SET expires_at = $1, status = $2, updated_at = NOW()
     WHERE id = $3 AND donor_user_id = $4
     RETURNING *`,
    [deadlineDate, newStatus, id, donorUserId]
  );

  logger.info('donation.service: donation deadline extended', { donationId: id, userId: donorUserId });

  AuditLog.create({
    user_id: donorUserId,
    action: 'DONATION_EXTENDED',
    resource: 'donations',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { donation_id: id, new_deadline: newDeadline },
  });

  return { donation: result.rows[0] };
}

/**
 * Scheduled worker job: find all listings where expires_at < NOW() and
 * status is ACTIVE or LOW_STOCK, transition them to EXPIRED, and invalidate any
 * active PENDING pickup reservations.
 */
async function markExpiredDonations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expiredDonations = await client.query(
      `UPDATE donations
       SET status = 'EXPIRED', updated_at = NOW()
       WHERE status IN ('ACTIVE', 'LOW_STOCK')
         AND expires_at < NOW()
         AND deleted_at IS NULL
       RETURNING id`
    );

    let expiredPickupsCount = 0;
    if (expiredDonations.rows.length > 0) {
      const expiredIds = expiredDonations.rows.map(r => r.id);
      const pickupsResult = await client.query(
        `UPDATE pickups
         SET status = 'EXPIRED', updated_at = NOW()
         WHERE donation_id = ANY($1::uuid[])
           AND status = 'PENDING'
         RETURNING id`,
        [expiredIds]
      );
      expiredPickupsCount = pickupsResult.rowCount;
    }

    await client.query('COMMIT');
    return {
      expired_donations_count: expiredDonations.rowCount,
      expired_pickups_count: expiredPickupsCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Add an image reference to a donation (max 4).
 */
async function addDonationImage(donationId, { url, alt_text, display_order }, donorUserId, ipAddress) {
  const existing = await Donation.findByIdAndDonor(donationId, donorUserId);
  if (!existing) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM donation_images WHERE donation_id = $1`,
    [donationId]
  );
  if (parseInt(countRes.rows[0].count, 10) >= 4) {
    throw serviceError('Maximum of 4 images per donation listing reached.', 'MAX_IMAGES_REACHED', 400);
  }

  const result = await pool.query(
    `INSERT INTO donation_images (donation_id, url, alt_text, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [donationId, url, alt_text || null, display_order ?? 0]
  );

  AuditLog.create({
    user_id: donorUserId,
    action: 'DONATION_IMAGE_ADDED',
    resource: 'donation_images',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { donation_id: donationId, image_id: result.rows[0].id },
  });

  return result.rows[0];
}

/**
 * Remove an image reference from a donation.
 */
async function removeDonationImage(donationId, imageId, donorUserId, ipAddress) {
  const existing = await Donation.findByIdAndDonor(donationId, donorUserId);
  if (!existing) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  const result = await pool.query(
    `DELETE FROM donation_images WHERE id = $1 AND donation_id = $2 RETURNING id`,
    [imageId, donationId]
  );
  if (!result.rows[0]) {
    throw serviceError('Image not found.', 'IMAGE_NOT_FOUND', 404);
  }

  AuditLog.create({
    user_id: donorUserId,
    action: 'DONATION_IMAGE_REMOVED',
    resource: 'donation_images',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { donation_id: donationId, image_id: imageId },
  });
}

/**
 * Get all images for a donation.
 */
async function getDonationImages(donationId) {
  const result = await pool.query(
    `SELECT * FROM donation_images WHERE donation_id = $1 ORDER BY display_order ASC, created_at ASC`,
    [donationId]
  );
  return result.rows;
}

module.exports = {
  createDonation,
  getDonation,
  listDonations,
  listMyDonations,
  updateDonation,
  deleteDonation,
  recallDonation,
  extendDonation,
  markExpiredDonations,
  addDonationImage,
  removeDonationImage,
  getDonationImages,
};
