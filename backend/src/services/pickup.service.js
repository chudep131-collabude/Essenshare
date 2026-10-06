/**
 * services/pickup.service.js
 * Business logic for the pickup and handover flow.
 * Framework-agnostic — no Express imports. Callable from tests without a running server.
 * All DB writes that must be atomic use a pool client with BEGIN/COMMIT/ROLLBACK.
 * AuditLog.create is fire-and-forget — never awaited, catches its own errors.
 */

'use strict';

const crypto = require('crypto');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const RecipientSession = require('../models/RecipientSession');
const Pickup = require('../models/Pickup');
const Cooldown = require('../models/Cooldown');
const ImpactRecord = require('../models/ImpactRecord');
const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');

// ── Error factory (same pattern as auth.service.js and donation.service.js) ──

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

// ─────────────────────────────────────────────────────────────────────────────
// requestPickup
// Public — identified only by a recipient session cookie.
// Validates the session, donation availability, cooldown, and duplicate guard,
// then atomically reserves quantity and creates the pickup row.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request a pickup for a donation.
 * @param {{ donation_id: string, requested_qty: number }} data
 * @param {string|null} rawSessionToken - Raw value of the recipient_session cookie
 * @param {string|null} ipAddress
 * @returns {Promise<{ pickup_id: string, display_code: string, raw_code: string, expires_at: Date, donation: object }>}
 */
async function requestPickup(data, rawSessionToken, ipAddress) {
  // 1. Validate session
  if (!rawSessionToken) {
    throw serviceError('No recipient session token provided', 'SESSION_INVALID', 401);
  }

  const session = await RecipientSession.findByToken(rawSessionToken);
  if (!session || !RecipientSession.isValid(session)) {
    throw serviceError('Recipient session is invalid or expired', 'SESSION_INVALID', 401);
  }

  // 2. Validate donation exists and is available
  const donation = await Donation.findById(data.donation_id);
  if (!donation || donation.deleted_at) {
    throw serviceError('Donation not found', 'DONATION_NOT_FOUND', 404);
  }

  if (donation.status !== 'ACTIVE') {
    throw serviceError(
      `Donation is not available (status: ${donation.status})`,
      'DONATION_NOT_AVAILABLE',
      409
    );
  }

  if (data.requested_qty > donation.quantity) {
    throw serviceError(
      `Requested quantity (${data.requested_qty}) exceeds available (${donation.quantity})`,
      'INSUFFICIENT_QUANTITY',
      409
    );
  }

  // 3. Check cooldown for this session/donor pair
  const onCooldown = await Cooldown.hasActive(session.id, donation.donor_user_id);
  if (onCooldown) {
    throw serviceError(
      'You must wait before requesting from this donor again',
      'COOLDOWN_ACTIVE',
      409
    );
  }

  // 4. Duplicate pending request guard
  const dupCheck = await pool.query(
    `SELECT 1 FROM pickups
     WHERE session_id = $1
       AND donation_id = $2
       AND status = 'PENDING'
     LIMIT 1`,
    [session.id, data.donation_id]
  );
  if (dupCheck.rows.length > 0) {
    throw serviceError(
      'A pending pickup request already exists for this donation',
      'DUPLICATE_REQUEST',
      409
    );
  }

  // 5. Compute expiry (sooner of 1 hour from now or donation expiry)
  const oneHourFromNow = Date.now() + 60 * 60 * 1000;
  const donationExpiry = new Date(donation.expires_at).getTime();
  const expiresAt = new Date(Math.min(oneHourFromNow, donationExpiry));

  // 6. Atomic quantity reserve — prevents race conditions
  const reserveResult = await pool.query(
    `UPDATE donations
     SET quantity = quantity - $1, updated_at = NOW()
     WHERE id = $2
       AND quantity >= $1
     RETURNING *`,
    [data.requested_qty, data.donation_id]
  );

  if (reserveResult.rows.length === 0) {
    throw serviceError('Insufficient quantity available', 'INSUFFICIENT_QUANTITY', 409);
  }

  const updatedDonation = reserveResult.rows[0];

  // 7. Create the pickup row
  const pickup = await Pickup.create({
    donation_id: data.donation_id,
    session_id: session.id,
    donor_user_id: donation.donor_user_id,
    requested_qty: data.requested_qty,
    expires_at: expiresAt,
  });

  // 8. Audit (fire-and-forget)
  AuditLog.create({
    user_id: null,
    action: 'PICKUP_REQUESTED',
    resource: 'pickups',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { pickup_id: pickup.id, donation_id: data.donation_id },
  });

  return {
    pickup_id: pickup.id,
    display_code: pickup.display_code,
    raw_code: pickup.rawCode,
    expires_at: pickup.expires_at,
    donation: updatedDonation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyCode
// Donor-authenticated. Looks up the raw code, checks it belongs to this donor,
// and returns pickup + donation info for the confirm step.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a raw pickup code presented by a recipient.
 * @param {string} rawCode
 * @param {string} donorUserId - From JWT (req.user.sub)
 * @param {string|null} ipAddress
 * @returns {Promise<{ pickup: object, donation: object|null }>}
 */
async function verifyCode(rawCode, donorUserId, ipAddress) {
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

  const pickup = await Pickup.findByCodeHash(codeHash);
  if (!pickup) {
    throw serviceError('Pickup code not found', 'PICKUP_NOT_FOUND', 404);
  }

  if (pickup.status !== 'PENDING') {
    throw serviceError(
      `Pickup is not pending (status: ${pickup.status})`,
      'PICKUP_NOT_PENDING',
      409
    );
  }

  if (new Date(pickup.expires_at) <= new Date()) {
    throw serviceError('Pickup code has expired', 'CODE_EXPIRED', 410);
  }

  if (pickup.donor_user_id !== donorUserId) {
    throw serviceError('This pickup does not belong to your account', 'WRONG_DONOR', 403);
  }

  // Fetch donation info for display
  const donationResult = await pool.query(
    `SELECT * FROM donations WHERE id = $1 LIMIT 1`,
    [pickup.donation_id]
  );

  return {
    pickup,
    donation: donationResult.rows[0] || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmPickup
// Donor-authenticated. Runs the critical writes inside a DB transaction:
//   1. Confirm the pickup row
//   2. Deduct confirmed_qty from donation (may mark it COMPLETED)
//   3. Insert impact record
//   4. Insert cooldown to prevent immediate re-request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Confirm a pickup handover after verifying the code.
 * @param {string} pickup_id
 * @param {{ confirmed_qty: number, confirmed_weight_kg?: number }} data
 * @param {string} donorUserId
 * @param {string|null} ipAddress
 * @returns {Promise<{ pickup: object, impact: object }>}
 */
async function confirmPickup(pickup_id, data, donorUserId, ipAddress) {
  // Pre-transaction checks
  const pickup = await Pickup.findById(pickup_id);
  if (!pickup) {
    throw serviceError('Pickup not found', 'PICKUP_NOT_FOUND', 404);
  }

  if (pickup.donor_user_id !== donorUserId) {
    throw serviceError('This pickup does not belong to your account', 'WRONG_DONOR', 403);
  }

  if (pickup.status !== 'PENDING') {
    throw serviceError(
      `Pickup is not pending (status: ${pickup.status})`,
      'PICKUP_NOT_PENDING',
      409
    );
  }

  if (new Date(pickup.expires_at) <= new Date()) {
    throw serviceError('Pickup code has expired', 'CODE_EXPIRED', 410);
  }

  // Fetch donation to get category and location for impact record
  const donation = await Donation.findById(pickup.donation_id);

  const confirmedQty = data.confirmed_qty;
  const confirmedWeightKg = data.confirmed_weight_kg || null;

  const client = await pool.connect();
  let confirmedPickup;
  let impactRecord;

  try {
    await client.query('BEGIN');

    // 1. Confirm pickup
    const pickupUpdate = await client.query(
      `UPDATE pickups
       SET status = 'CONFIRMED',
           confirmed_at = NOW(),
           confirmed_qty = $2,
           confirmed_weight_kg = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [pickup_id, confirmedQty, confirmedWeightKg]
    );
    confirmedPickup = pickupUpdate.rows[0];

    // 2. Deduct from donation; mark COMPLETED if quantity reaches zero
    await client.query(
      `UPDATE donations
       SET quantity = GREATEST(0, quantity - $1),
           status = CASE WHEN GREATEST(0, quantity - $1) = 0 THEN 'COMPLETED' ELSE status END,
           updated_at = NOW()
       WHERE id = $2`,
      [confirmedQty, pickup.donation_id]
    );

    // 3. Insert impact record
    const impactInsert = await client.query(
      `INSERT INTO impact_records
         (pickup_id, donation_id, donor_user_id, category, quantity, weight_kg, country_code, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        pickup_id,
        pickup.donation_id,
        donorUserId,
        donation ? donation.category : 'UNKNOWN',
        confirmedQty,
        confirmedWeightKg,
        donation ? (donation.country_code || null) : null,
        donation ? (donation.city || null) : null,
      ]
    );
    impactRecord = impactInsert.rows[0];

    // 4. Insert cooldown
    await client.query(
      `INSERT INTO cooldowns (session_id, donor_user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '4 hours')`,
      [pickup.session_id, donorUserId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('confirmPickup transaction failed', { pickup_id, error: err.message });
    throw err;
  } finally {
    client.release();
  }

  // Audit (fire-and-forget — outside transaction)
  AuditLog.create({
    user_id: donorUserId,
    action: 'PICKUP_COMPLETED',
    resource: 'pickups',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { pickup_id, donation_id: pickup.donation_id, confirmed_qty: confirmedQty },
  });

  return { pickup: confirmedPickup, impact: impactRecord };
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelPickup
// Public — identified only by the recipient session cookie.
// Restores reserved quantity to the donation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancel a pending pickup request (recipient action).
 * @param {string} pickup_id
 * @param {string|null} rawSessionToken
 * @param {string|null} ipAddress
 * @returns {Promise<{ cancelled: true }>}
 */
async function cancelPickup(pickup_id, rawSessionToken, ipAddress) {
  if (!rawSessionToken) {
    throw serviceError('No recipient session token provided', 'SESSION_INVALID', 401);
  }

  const session = await RecipientSession.findByToken(rawSessionToken);
  if (!session || !RecipientSession.isValid(session)) {
    throw serviceError('Recipient session is invalid or expired', 'SESSION_INVALID', 401);
  }

  const pickup = await Pickup.findById(pickup_id);
  if (!pickup) {
    throw serviceError('Pickup not found', 'PICKUP_NOT_FOUND', 404);
  }

  if (pickup.session_id !== session.id) {
    throw serviceError('This pickup does not belong to your session', 'WRONG_SESSION', 403);
  }

  if (pickup.status !== 'PENDING') {
    throw serviceError(
      `Pickup cannot be cancelled (status: ${pickup.status})`,
      'PICKUP_NOT_PENDING',
      409
    );
  }

  // Cancel pickup
  await Pickup.cancel(pickup_id);

  // Restore quantity to donation
  await pool.query(
    `UPDATE donations
     SET quantity = quantity + $1, updated_at = NOW()
     WHERE id = $2`,
    [pickup.requested_qty, pickup.donation_id]
  );

  // Audit (fire-and-forget)
  AuditLog.create({
    user_id: null,
    action: 'PICKUP_CANCELLED',
    resource: 'pickups',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { pickup_id },
  });

  return { cancelled: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPickupStatus
// Public — identified only by the recipient session cookie.
// Returns status fields for the pickup if it belongs to this session.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current status of a pickup (recipient view).
 * @param {string} pickup_id
 * @param {string|null} rawSessionToken
 * @returns {Promise<{ id: string, status: string, display_code: string, expires_at: Date, confirmed_at: Date|null, cancelled_at: Date|null }>}
 */
async function getPickupStatus(pickup_id, rawSessionToken) {
  if (!rawSessionToken) {
    throw serviceError('No recipient session token provided', 'SESSION_INVALID', 401);
  }

  const session = await RecipientSession.findByToken(rawSessionToken);
  if (!session || !RecipientSession.isValid(session)) {
    throw serviceError('Recipient session is invalid or expired', 'SESSION_INVALID', 401);
  }

  const pickup = await Pickup.findById(pickup_id);
  if (!pickup) {
    throw serviceError('Pickup not found', 'PICKUP_NOT_FOUND', 404);
  }

  if (pickup.session_id !== session.id) {
    throw serviceError('This pickup does not belong to your session', 'WRONG_SESSION', 403);
  }

  return {
    id: pickup.id,
    status: pickup.status,
    display_code: pickup.display_code,
    expires_at: pickup.expires_at,
    confirmed_at: pickup.confirmed_at,
    cancelled_at: pickup.cancelled_at,
  };
}

module.exports = {
  requestPickup,
  verifyCode,
  confirmPickup,
  cancelPickup,
  getPickupStatus,
};
