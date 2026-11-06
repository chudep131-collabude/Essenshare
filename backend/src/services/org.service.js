/**
 * services/org.service.js
 * Business logic for partner organizations (Phase 8).
 * Handles profile management, browsing surplus for bulk allocation,
 * requesting allocations, and tracking distribution history.
 */

'use strict';

const { pool } = require('../config/database');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../utils/logger');

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Get organization profile by user ID.
 */
async function getProfile(userId) {
  const result = await pool.query(
    `SELECT
       u.id, u.role, u.status, u.full_name, u.phone, u.country_code,
       u.email_verified, u.created_at,
       o.id AS org_id, o.org_name, o.registration_no, o.address, o.website, o.verified
     FROM users u
     LEFT JOIN organizations o ON o.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  if (!result.rows[0]) {
    throw serviceError('Organization profile not found.', 'PROFILE_NOT_FOUND', 404);
  }
  return result.rows[0];
}

/**
 * Update organization profile.
 */
async function updateProfile(userId, data, ipAddress) {
  const { full_name, phone, country_code, org_name, registration_no, address, website } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update user fields
    const userUpdates = [];
    const userVals = [];
    if (full_name !== undefined) { userUpdates.push(`full_name = $${userVals.length + 1}`); userVals.push(full_name); }
    if (phone !== undefined) { userUpdates.push(`phone = $${userVals.length + 1}`); userVals.push(phone); }
    if (country_code !== undefined) { userUpdates.push(`country_code = $${userVals.length + 1}`); userVals.push(country_code); }

    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = NOW()');
      await client.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${userVals.length + 1}`,
        [...userVals, userId]
      );
    }

    // Update org fields
    const orgUpdates = [];
    const orgVals = [];
    if (org_name !== undefined) { orgUpdates.push(`org_name = $${orgVals.length + 1}`); orgVals.push(org_name); }
    if (registration_no !== undefined) { orgUpdates.push(`registration_no = $${orgVals.length + 1}`); orgVals.push(registration_no); }
    if (address !== undefined) { orgUpdates.push(`address = $${orgVals.length + 1}`); orgVals.push(address); }
    if (website !== undefined) { orgUpdates.push(`website = $${orgVals.length + 1}`); orgVals.push(website); }

    if (orgUpdates.length > 0) {
      orgUpdates.push('updated_at = NOW()');
      await client.query(
        `UPDATE organizations SET ${orgUpdates.join(', ')} WHERE user_id = $${orgVals.length + 1}`,
        [...orgVals, userId]
      );
    }

    await client.query('COMMIT');

    logger.info('org.service: profile updated', { userId });
    AuditLog.create({
      user_id: userId,
      action: 'ORG_PROFILE_UPDATED',
      resource: 'organizations',
      ip_address: ipAddress,
      outcome: 'SUCCESS',
      meta: { updated_fields: Object.keys(data) },
    });

    return getProfile(userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List donations available for organization allocation.
 */
async function listDonations(query = {}) {
  const { category, page = 1, limit = 20, min_quantity = 1 } = query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const conditions = [
    `d.status IN ('ACTIVE', 'LOW_STOCK')`,
    `d.deleted_at IS NULL`,
    `d.expires_at > NOW()`,
    `d.quantity >= $1`,
  ];
  const params = [min_quantity];

  if (category) {
    params.push(category);
    conditions.push(`d.category = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM donations d ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(pageLimit, offset);
  const dataRes = await pool.query(
    `SELECT
       d.id, d.title, d.description, d.category, d.quantity, d.quantity_unit,
       d.weight_kg, d.pickup_address, d.pickup_lat, d.pickup_lng,
       d.available_from, d.expires_at, d.created_at,
       u.full_name AS donor_name,
       dn.business_name AS donor_business_name
     FROM donations d
     JOIN users u ON u.id = d.donor_user_id
     LEFT JOIN donors dn ON dn.user_id = d.donor_user_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    donations: dataRes.rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: pageLimit,
      total_pages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Request an allocation of surplus resources.
 */
async function requestAllocation(userId, data, ipAddress) {
  const { listing_id, requested_quantity, notes } = data;

  const donationRes = await pool.query(
    `SELECT id, quantity, status, deleted_at, expires_at FROM donations WHERE id = $1`,
    [listing_id]
  );
  const donation = donationRes.rows[0];

  if (!donation || donation.deleted_at) {
    throw serviceError('Donation listing not found.', 'DONATION_NOT_FOUND', 404);
  }
  if (!['ACTIVE', 'LOW_STOCK'].includes(donation.status)) {
    throw serviceError(`Donation is not available for allocation (status: ${donation.status}).`, 'DONATION_NOT_AVAILABLE', 409);
  }
  if (new Date(donation.expires_at).getTime() <= Date.now()) {
    throw serviceError('Donation has expired.', 'DONATION_EXPIRED', 409);
  }
  if (requested_quantity > donation.quantity) {
    throw serviceError(`Requested quantity (${requested_quantity}) exceeds available quantity (${donation.quantity}).`, 'INSUFFICIENT_QUANTITY', 409);
  }

  const result = await pool.query(
    `INSERT INTO org_allocations (org_user_id, donation_id, requested_quantity, notes, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW())
     RETURNING *`,
    [userId, listing_id, requested_quantity, notes || null]
  );

  const allocation = result.rows[0];

  logger.info('org.service: allocation requested', { allocationId: allocation.id, userId, listing_id });
  AuditLog.create({
    user_id: userId,
    action: 'ORG_ALLOCATION_REQUESTED',
    resource: 'org_allocations',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { allocation_id: allocation.id, donation_id: listing_id, quantity: requested_quantity },
  });

  return allocation;
}

/**
 * List allocations requested by an organization.
 */
async function listAllocations(userId, query = {}) {
  const { status, page = 1, limit = 20 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * pageLimit;

  const conditions = [`oa.org_user_id = $1`];
  const params = [userId];

  if (status) {
    params.push(status);
    conditions.push(`oa.status = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM org_allocations oa ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(pageLimit, offset);
  const dataRes = await pool.query(
    `SELECT
       oa.id, oa.donation_id, oa.requested_quantity, oa.status, oa.notes,
       oa.created_at, oa.updated_at,
       d.title AS donation_title, d.category, d.quantity_unit, d.pickup_address
     FROM org_allocations oa
     JOIN donations d ON d.id = oa.donation_id
     ${whereClause}
     ORDER BY oa.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    allocations: dataRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      total_pages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Cancel an organization's pending allocation.
 */
async function cancelAllocation(allocationId, userId, ipAddress) {
  const existing = await pool.query(
    `SELECT id, status FROM org_allocations WHERE id = $1 AND org_user_id = $2`,
    [allocationId, userId]
  );
  if (!existing.rows[0]) {
    throw serviceError('Allocation not found.', 'ALLOCATION_NOT_FOUND', 404);
  }
  if (existing.rows[0].status !== 'PENDING') {
    throw serviceError(`Cannot cancel an allocation with status ${existing.rows[0].status}.`, 'INVALID_STATUS', 409);
  }

  await pool.query(
    `UPDATE org_allocations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
    [allocationId]
  );

  AuditLog.create({
    user_id: userId,
    action: 'ORG_ALLOCATION_CANCELLED',
    resource: 'org_allocations',
    ip_address: ipAddress,
    outcome: 'SUCCESS',
    meta: { allocation_id: allocationId },
  });
}

module.exports = {
  getProfile,
  updateProfile,
  listDonations,
  requestAllocation,
  listAllocations,
  cancelAllocation,
};
