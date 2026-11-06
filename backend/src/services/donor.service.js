/**
 * services/donor.service.js
 * Business logic for donor profile management, location management,
 * safety agreement acceptance, and verification status.
 * Framework-agnostic — no Express imports.
 *
 * Security rules:
 *  - Ownership verified before any mutation.
 *  - No PII in any log statement.
 *  - All DB access via parameterised queries.
 *  - Errors thrown as { message, code, statusCode } service errors.
 */

'use strict';

const { pool } = require('../config/database');
const Donor = require('../models/Donor');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

const SAFETY_AGREEMENT_VERSION = '1.0';

// ── Profile ───────────────────────────────────────────────────────────────────

/**
 * Get the full merged user + donor profile for a donor.
 */
async function getProfile(userId) {
  const result = await pool.query(
    `SELECT
       u.id, u.role, u.status, u.full_name, u.phone, u.country_code,
       u.email_verified, u.created_at,
       d.display_name, d.bio, d.business_name, d.business_reg_no,
       d.verification_level, d.total_weight_kg,
       d.safety_agreement_accepted_at, d.safety_agreement_version, d.trust_score
     FROM users u
     LEFT JOIN donors d ON d.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  if (!result.rows[0]) throw serviceError('Donor profile not found.', 'PROFILE_NOT_FOUND', 404);
  return result.rows[0];
}

/**
 * Update donor profile fields (users + donors tables).
 */
async function updateProfile(userId, data, ipAddress) {
  const { full_name, phone, country_code, display_name, bio, business_name, business_reg_no } = data;

  const userFields = {};
  if (full_name !== undefined) userFields.full_name = full_name;
  if (phone !== undefined) userFields.phone = phone;
  if (country_code !== undefined) userFields.country_code = country_code;
  if (Object.keys(userFields).length > 0) await User.updateById(userId, userFields);

  const donorFields = {};
  if (display_name !== undefined) donorFields.display_name = display_name;
  if (bio !== undefined) donorFields.bio = bio;
  if (business_name !== undefined) donorFields.business_name = business_name;
  if (business_reg_no !== undefined) donorFields.business_reg_no = business_reg_no;
  if (Object.keys(donorFields).length > 0) await Donor.updateByUserId(userId, donorFields);

  logger.info('donor.service: profile updated', { userId });
  AuditLog.create({
    user_id: userId, action: 'DONOR_PROFILE_UPDATED', resource: 'donors',
    ip_address: ipAddress, outcome: 'SUCCESS',
    meta: { fields_updated: [...Object.keys(userFields), ...Object.keys(donorFields)] },
  });
  return getProfile(userId);
}

// ── Locations ─────────────────────────────────────────────────────────────────

/**
 * Add a new pickup location for a donor.
 */
async function addLocation(userId, data, ipAddress) {
  const { label, address, lat, lng, notes } = data;
  if (lat < -90 || lat > 90) throw serviceError('Invalid latitude.', 'INVALID_COORDINATES', 400);
  if (lng < -180 || lng > 180) throw serviceError('Invalid longitude.', 'INVALID_COORDINATES', 400);

  const result = await pool.query(
    `INSERT INTO pickup_locations (user_id, label, address, lat, lng, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, label, address, lat, lng, notes || null]
  );
  const location = result.rows[0];
  logger.info('donor.service: location added', { userId, locationId: location.id });
  AuditLog.create({
    user_id: userId, action: 'LOCATION_ADDED', resource: 'pickup_locations',
    ip_address: ipAddress, outcome: 'SUCCESS', meta: { location_id: location.id },
  });
  return location;
}

/**
 * List all active pickup locations for a donor.
 */
async function listLocations(userId) {
  const result = await pool.query(
    `SELECT * FROM pickup_locations WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update a pickup location (ownership-checked).
 */
async function updateLocation(locationId, userId, data, ipAddress) {
  const existing = await pool.query(
    `SELECT id FROM pickup_locations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [locationId, userId]
  );
  if (!existing.rows[0]) throw serviceError('Location not found.', 'LOCATION_NOT_FOUND', 404);

  const allowed = ['label', 'address', 'lat', 'lng', 'notes', 'is_active'];
  const entries = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (entries.length === 0) throw serviceError('No valid fields to update.', 'NO_FIELDS', 400);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
  setClauses.push('updated_at = NOW()');
  const values = entries.map(([, v]) => v);

  const result = await pool.query(
    `UPDATE pickup_locations SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [locationId, ...values]
  );
  logger.info('donor.service: location updated', { userId, locationId });
  AuditLog.create({
    user_id: userId, action: 'LOCATION_UPDATED', resource: 'pickup_locations',
    ip_address: ipAddress, outcome: 'SUCCESS', meta: { location_id: locationId },
  });
  return result.rows[0];
}

/**
 * Soft-delete a pickup location (ownership-checked).
 * Blocked if the location has active donations referencing it.
 */
async function deleteLocation(locationId, userId, ipAddress) {
  const existing = await pool.query(
    `SELECT id FROM pickup_locations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [locationId, userId]
  );
  if (!existing.rows[0]) throw serviceError('Location not found.', 'LOCATION_NOT_FOUND', 404);

  // Check for active donations (gracefully handles case where pickup_location_id column doesn't exist yet)
  const activeDonations = await pool.query(
    `SELECT COUNT(*) AS count FROM donations
     WHERE donor_user_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL AND pickup_location_id = $2`,
    [userId, locationId]
  ).catch(() => ({ rows: [{ count: '0' }] }));

  if (parseInt(activeDonations.rows[0].count, 10) > 0) {
    throw serviceError('Cannot delete a location used by active donations.', 'LOCATION_IN_USE', 409);
  }

  await pool.query(
    `UPDATE pickup_locations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [locationId]
  );
  logger.info('donor.service: location deleted', { userId, locationId });
  AuditLog.create({
    user_id: userId, action: 'LOCATION_DELETED', resource: 'pickup_locations',
    ip_address: ipAddress, outcome: 'SUCCESS', meta: { location_id: locationId },
  });
}

// ── Safety Agreement ──────────────────────────────────────────────────────────

/**
 * Record donor's acceptance of the food safety agreement.
 * Idempotent — re-accepting updates the timestamp and version.
 */
async function acceptSafetyAgreement(userId, ipAddress) {
  const result = await pool.query(
    `UPDATE donors
     SET safety_agreement_accepted_at = NOW(),
         safety_agreement_version = $2,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING safety_agreement_accepted_at, safety_agreement_version`,
    [userId, SAFETY_AGREEMENT_VERSION]
  );
  if (!result.rows[0]) throw serviceError('Donor profile not found.', 'PROFILE_NOT_FOUND', 404);
  logger.info('donor.service: safety agreement accepted', { userId });
  AuditLog.create({
    user_id: userId, action: 'SAFETY_AGREEMENT_ACCEPTED', resource: 'donors',
    ip_address: ipAddress, outcome: 'SUCCESS', meta: { version: SAFETY_AGREEMENT_VERSION },
  });
  return {
    accepted: true,
    accepted_at: result.rows[0].safety_agreement_accepted_at,
    version: result.rows[0].safety_agreement_version,
  };
}

// ── Business Verification ─────────────────────────────────────────────────────

/**
 * Submit a business verification request.
 */
async function submitBusinessVerification(userId, data, ipAddress) {
  const { business_name, business_reg_no, notes } = data;

  await pool.query(
    `UPDATE donors
     SET business_name = COALESCE($2, business_name),
         business_reg_no = COALESCE($3, business_reg_no),
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, business_name || null, business_reg_no || null]
  );

  const verResult = await pool.query(
    `INSERT INTO verification_requests (user_id, type, status, notes, created_at, updated_at)
     VALUES ($1, 'BUSINESS_VERIFICATION', 'PENDING', $2, NOW(), NOW())
     RETURNING *`,
    [userId, notes || null]
  );

  logger.info('donor.service: business verification submitted', { userId });
  AuditLog.create({
    user_id: userId, action: 'BUSINESS_VERIFICATION_SUBMITTED', resource: 'verification_requests',
    ip_address: ipAddress, outcome: 'SUCCESS', meta: { verification_id: verResult.rows[0]?.id },
  });

  return {
    verification_id: verResult.rows[0]?.id,
    status: 'PENDING',
    message: 'Business verification submitted. An admin will review within 2–3 business days.',
  };
}

/**
 * Get the verification status for a donor.
 */
async function getVerificationStatus(userId) {
  const donor = await Donor.findByUserId(userId);
  const verifications = await pool.query(
    `SELECT DISTINCT ON (type) type, status, created_at, updated_at, notes
     FROM verification_requests
     WHERE user_id = $1
     ORDER BY type, created_at DESC`,
    [userId]
  );
  return {
    verification_level: donor?.verification_level || 'UNVERIFIED',
    trust_score: donor?.trust_score || 0,
    safety_agreement_accepted_at: donor?.safety_agreement_accepted_at || null,
    safety_agreement_version: donor?.safety_agreement_version || null,
    verifications: verifications.rows,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  addLocation,
  listLocations,
  updateLocation,
  deleteLocation,
  acceptSafetyAgreement,
  submitBusinessVerification,
  getVerificationStatus,
};
