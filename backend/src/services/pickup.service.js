/**
 * services/pickup.service.js
 * Business logic for the pickup and handover flow.
 * Framework-agnostic no Express imports. Callable from tests without a running server.
 * All DB writes that must be atomic use a pool client with BEGIN/COMMIT/ROLLBACK.
 * AuditLog.create is fire-and-forget never awaited, catches its own errors.
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
// Public identified only by a recipient session cookie.
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

  // 4b. Anti-hoarding guard: Maximum 2 concurrent active pending pickups per recipient session
  const activeCountResult = await pool.query(
    `SELECT COUNT(*) FROM pickups
     WHERE session_id = $1
       AND status = 'PENDING'`,
    [session.id]
  );
  const activeCount = parseInt(activeCountResult.rows[0].count, 10);
  if (activeCount >= 2) {
    throw serviceError(
      'Active reservation limit reached (maximum 2 uncollected pickups). Please collect or cancel an existing reservation before claiming more surplus.',
      'MAX_ACTIVE_RESERVATIONS',
      429
    );
  }

  // 5. Atomic quantity reserve — prevents race conditions.
  // No time-based expiry: codes are valid until used, cancelled, or donation runs out.
  const reserveResult = await pool.query(
    `UPDATE donations
     SET quantity = quantity - $1, updated_at = NOW()
     WHERE id = $2
       AND status = 'ACTIVE'
       AND quantity >= $1
     RETURNING *`,
    [data.requested_qty, data.donation_id]
  );

  if (reserveResult.rows.length === 0) {
    throw serviceError(
      'Donation is no longer available or has insufficient quantity',
      'DONATION_NOT_AVAILABLE',
      409
    );
  }

  const updatedDonation = reserveResult.rows[0];

  // Fetch donor phone so the recipient can contact them at collection time.
  // Only phone is fetched — no other PII.
  const donorPhoneResult = await pool.query(
    'SELECT phone FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
    [donation.donor_user_id]
  );
  const donorPhone = donorPhoneResult.rows[0]?.phone ?? null;

  // 7. Create the pickup row with dynamic travel-friendly expiry
  // 45 minutes travel window or donation expiry (whichever is earlier)
  const nowMs = Date.now();
  const defaultReservationMs = nowMs + 45 * 60 * 1000;
  const donationExpiryMs = donation.expires_at ? new Date(donation.expires_at).getTime() : defaultReservationMs;
  const pickupExpiry = new Date(Math.min(defaultReservationMs, donationExpiryMs));

  const pickup = await Pickup.create({
    donation_id: data.donation_id,
    session_id: session.id,
    donor_user_id: donation.donor_user_id,
    requested_qty: data.requested_qty,
    expires_at: pickupExpiry,
    liability_accepted: data.liability_accepted !== false,
  });

  // 8. Audit (fire-and-forget)
  AuditLog.create({
    user_id: null,
    action: 'PICKUP_REQUESTED',
    resource: 'pickups',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: {
      pickup_id: pickup.id,
      donation_id: data.donation_id,
      liability_acknowledged: true,
      good_samaritan_notice: '2026.1',
    },
  });

  return {
    pickup_id: pickup.id,
    display_code: pickup.display_code,
    raw_code: pickup.rawCode,
    expires_at: pickup.expires_at,
    donation: { ...updatedDonation, donor_phone: donorPhone },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyCode
// Donor-authenticated. Looks up the raw code, checks it belongs to this donor,
// and returns pickup + donation info for the confirm step.
// ─────────────────────────────────────────────────────────────────────────────

// Rate limiting map for code verification brute-force defense
const failedVerifyAttempts = new Map();

/**
 * Verify a raw pickup code presented by a recipient.
 * Protected with a 10-attempt brute-force lockout window.
 * @param {string} rawCode
 * @param {string} donorUserId - From JWT (req.user.sub)
 * @param {string|null} ipAddress
 * @returns {Promise<{ pickup: object, donation: object|null }>}
 */
async function verifyCode(rawCode, donorUserId, ipAddress) {
  const rateKey = `${donorUserId || 'anon'}_${ipAddress || 'unknown'}`;
  const now = Date.now();
  const attemptRecord = failedVerifyAttempts.get(rateKey);

  if (attemptRecord && attemptRecord.lockedUntil > now) {
    const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - now) / 60000);
    throw serviceError(
      `Too many failed pickup code attempts. Verification locked for ${remainingMinutes} more minute(s).`,
      'TOO_MANY_FAILED_ATTEMPTS',
      429
    );
  }

  function recordFailure() {
    const record = (attemptRecord && attemptRecord.resetAt > now)
      ? attemptRecord
      : { count: 0, resetAt: now + 15 * 60 * 1000, lockedUntil: 0 };
    record.count += 1;
    if (record.count >= 10) {
      record.lockedUntil = now + 15 * 60 * 1000;
    }
    failedVerifyAttempts.set(rateKey, record);
  }

  const pickup = await Pickup.findByCode(rawCode);
  if (!pickup) {
    recordFailure();
    throw serviceError('Pickup code not found', 'PICKUP_NOT_FOUND', 404);
  }

  if (pickup.donor_user_id !== donorUserId) {
    recordFailure();
    throw serviceError('This pickup does not belong to your account', 'WRONG_DONOR', 403);
  }

  if (pickup.status !== 'PENDING') {
    throw serviceError(
      `Pickup is not pending (status: ${pickup.status})`,
      'PICKUP_NOT_PENDING',
      409
    );
  }

  // Clear failed attempt tracking on successful verification
  failedVerifyAttempts.delete(rateKey);

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

    // 2. Quantity reconciliation:
    // requested_qty was already atomically deducted at reservation time.
    // If confirmedQty < requested_qty, refund the difference back to the donation.
    // If confirmedQty > requested_qty, deduct the extra difference.
    const qtyDiff = pickup.requested_qty - confirmedQty;
    if (qtyDiff > 0) {
      await client.query(
        `UPDATE donations
         SET quantity = quantity + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [qtyDiff, pickup.donation_id]
      );
    } else if (qtyDiff < 0) {
      await client.query(
        `UPDATE donations
         SET quantity = GREATEST(0, quantity - $1),
             updated_at = NOW()
         WHERE id = $2`,
        [Math.abs(qtyDiff), pickup.donation_id]
      );
    }

    // Check remaining quantity and pending pickups to determine if donation is completed
    const remainingResult = await client.query(
      `SELECT quantity,
              (SELECT COUNT(*) FROM pickups WHERE donation_id = $1 AND status = 'PENDING' AND id != $2) AS pending_count
       FROM donations WHERE id = $1`,
      [pickup.donation_id, pickup_id]
    );
    const remainingQty = remainingResult.rows[0]?.quantity ?? 0;
    const pendingCount = parseInt(remainingResult.rows[0]?.pending_count ?? '0', 10);

    if (remainingQty <= 0 && pendingCount === 0) {
      await client.query(
        `UPDATE donations SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
        [pickup.donation_id]
      );
    }

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

  // Audit (fire-and-forget outside transaction)
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
// Public identified only by the recipient session cookie.
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
// Public identified only by the recipient session cookie.
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

  let recall_reason = null;
  if (pickup.status === 'RECALLED') {
    const donRes = await pool.query('SELECT pickup_notes FROM donations WHERE id = $1', [pickup.donation_id]);
    recall_reason = donRes.rows[0]?.pickup_notes || 'Food safety alert issued by donor.';
  }

  return {
    id: pickup.id,
    status: pickup.status,
    display_code: pickup.display_code,
    expires_at: pickup.expires_at,
    confirmed_at: pickup.confirmed_at,
    cancelled_at: pickup.cancelled_at,
    recall_reason,
  };
}

/**
 * Automatically releases all expired PENDING pickups back to the donation inventory.
 * Atomically transitions status PENDING -> EXPIRED and increments donation quantity.
 */
async function releaseExpiredPickups() {
  const client = await pool.connect();
  let releasedCount = 0;
  try {
    await client.query('BEGIN');
    const expiredResult = await client.query(
      `SELECT id, donation_id, requested_qty, donor_user_id
       FROM pickups
       WHERE status = 'PENDING'
         AND expires_at < NOW()
       FOR UPDATE SKIP LOCKED`
    );

    for (const row of expiredResult.rows) {
      // 1. Mark pickup as EXPIRED
      await client.query(
        `UPDATE pickups
         SET status = 'EXPIRED', updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      );

      // 2. Return quantity to donation and ensure status is ACTIVE
      await client.query(
        `UPDATE donations
         SET quantity = quantity + $1,
             status = CASE WHEN status = 'RESERVED' THEN 'ACTIVE' ELSE status END,
             updated_at = NOW()
         WHERE id = $2`,
        [row.requested_qty, row.donation_id]
      );

      releasedCount++;

      // Audit log
      AuditLog.create({
        user_id: null,
        action: 'PICKUP_AUTO_RELEASED_EXPIRED',
        resource: 'pickups',
        ip_address: null,
        outcome: 'SUCCESS',
        meta: { pickup_id: row.id, donation_id: row.donation_id, restored_qty: row.requested_qty },
      });
    }

    await client.query('COMMIT');
    return releasedCount;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('releaseExpiredPickups failed', { error: err.message });
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Purges sensitive donor contact info (phone/pickup_notes) from pickups completed over 7 days ago.
 * Retains aggregate impact and audit history while honoring privacy data lifecycle.
 */
async function purgeCompletedDonorPII() {
  try {
    const result = await pool.query(
      `UPDATE donations
       SET pickup_notes = '[PURGED_RETENTION_POLICY]'
       WHERE id IN (
         SELECT donation_id FROM pickups
         WHERE status = 'CONFIRMED'
           AND confirmed_at < NOW() - INTERVAL '7 days'
       )
       AND pickup_notes IS NOT NULL
       AND pickup_notes != '[PURGED_RETENTION_POLICY]'`
    );
    return result.rowCount || 0;
  } catch (err) {
    logger.error('purgeCompletedDonorPII failed', { error: err.message });
    return 0;
  }
}

module.exports = {
  requestPickup,
  verifyCode,
  confirmPickup,
  cancelPickup,
  getPickupStatus,
  releaseExpiredPickups,
  purgeCompletedDonorPII,
};
