/**
 * services/admin.service.js
 * Admin management operations.
 * Framework-agnostic no Express imports.
 * AuditLog.create is always fire-and-forget (never awaited).
 * password_hash is NEVER returned from any function in this file.
 */
'use strict';

const { pool } = require('../config/database');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ── Error factory ─────────────────────────────────────────────────────────────

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

// ── Safe user columns (password_hash excluded) ────────────────────────────────

const SAFE_USER_COLS = `id, email, role, status, full_name, phone, country_code,
                        email_verified, created_at, updated_at`;

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardStats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate platform-wide stats for the admin dashboard.
 * Runs all queries in parallel.
 * @returns {Promise<object>}
 */
async function getDashboardStats() {
  const [usersRes, donationsRes, reportsRes, pickupsRes, recent24hRes] = await Promise.all([
    // total users (not deleted), active_donors
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_users,
         COUNT(*) FILTER (
           WHERE deleted_at IS NULL
             AND status = 'ACTIVE'
             AND role IN ('INDIVIDUAL_DONOR', 'BUSINESS_DONOR')
         ) AS active_donors
       FROM users`
    ),
    // total donations
    pool.query(
      `SELECT COUNT(*) AS total_donations FROM donations WHERE deleted_at IS NULL`
    ),
    // pending (OPEN) reports
    pool.query(
      `SELECT COUNT(*) AS pending_reports FROM reports WHERE status = 'OPEN'`
    ),
    // total completed pickups
    pool.query(
      `SELECT COUNT(*) AS total_pickups FROM pickups WHERE status = 'CONFIRMED'`
    ),
    // new user registrations in the last 24 hours
    pool.query(
      `SELECT COUNT(*) AS recent_registrations_24h
       FROM users
       WHERE created_at > NOW() - INTERVAL '24 hours'
         AND deleted_at IS NULL`
    ),
  ]);

  return {
    total_users:               parseInt(usersRes.rows[0].total_users, 10),
    active_donors:             parseInt(usersRes.rows[0].active_donors, 10),
    total_donations:           parseInt(donationsRes.rows[0].total_donations, 10),
    pending_reports:           parseInt(reportsRes.rows[0].pending_reports, 10),
    total_pickups:             parseInt(pickupsRes.rows[0].total_pickups, 10),
    recent_registrations_24h:  parseInt(recent24hRes.rows[0].recent_registrations_24h, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// listUsers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List users with optional filters and pagination.
 * Never returns password_hash.
 * @param {{ role?: string, status?: string, search?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ rows: object[], total: number, page: number, limit: number }>}
 */
async function listUsers({ role, status, search, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status === 'DELETED' || status === 'BANNED') {
    conditions.push(`(deleted_at IS NOT NULL OR status = 'DELETED')`);
  } else {
    conditions.push('deleted_at IS NULL');
    if (status === 'PENDING') {
      conditions.push(`(status = 'PENDING' OR email_verified = FALSE)`);
    } else if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
  }

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`full_name ILIKE $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Capture param index before adding limit/offset
  const filterParamCount = params.length;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM users ${where}`,
    params.slice(0, filterParamCount)
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT ${SAFE_USER_COLS}
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total, page, limit };
}

// ─────────────────────────────────────────────────────────────────────────────
// getUser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single user by ID with donation and report counts.
 * Never returns password_hash.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUser(userId) {
  const userResult = await pool.query(
    `SELECT ${SAFE_USER_COLS} FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  if (!userResult.rows[0]) {
    throw serviceError('User not found.', 'USER_NOT_FOUND', 404);
  }

  const user = userResult.rows[0];

  // Counts run in parallel
  const [donationsRes, reportsRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS count FROM donations WHERE donor_user_id = $1 AND deleted_at IS NULL`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) AS count FROM reports
       WHERE donation_id IN (
         SELECT id FROM donations WHERE donor_user_id = $1
       )`,
      [userId]
    ),
  ]);

  return {
    ...user,
    donation_count: parseInt(donationsRes.rows[0].count, 10),
    report_count:   parseInt(reportsRes.rows[0].count, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateUserStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Change a user's status. Handles ACTIVE, SUSPENDED, BANNED.
 * BANNED maps to users.status = 'DELETED' with deleted_at set.
 * SUSPENDED/BANNED also hides the user's active donations.
 * Cannot modify another ADMIN account.
 * @param {string} userId
 * @param {'ACTIVE'|'SUSPENDED'|'BANNED'} status
 * @param {string} reason
 * @param {string} adminUserId
 * @param {string|null} ipAddress
 * @returns {Promise<object>} Updated user (no password_hash)
 */
async function updateUserStatus(userId, status, reason, adminUserId, ipAddress) {
  // Load target user (includes password_hash we strip before returning)
  const target = await User.findById(userId);
  if (!target) {
    throw serviceError('User not found.', 'USER_NOT_FOUND', 404);
  }

  // Admins cannot modify other admin accounts
  if (target.role === 'ADMIN') {
    throw serviceError(
      'Cannot modify the status of another admin account.',
      'CANNOT_MODIFY_ADMIN',
      403
    );
  }

  let updatedUser;

  if (status === 'BANNED') {
    // BANNED → soft-delete: status = 'DELETED', deleted_at = NOW()
    const result = await pool.query(
      `UPDATE users
       SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${SAFE_USER_COLS}`,
      [userId]
    );
    updatedUser = result.rows[0];
  } else {
    // ACTIVE or SUSPENDED
    const result = await pool.query(
      `UPDATE users
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${SAFE_USER_COLS}`,
      [userId, status]
    );
    updatedUser = result.rows[0];
  }

  if (!updatedUser) {
    throw serviceError('User not found.', 'USER_NOT_FOUND', 404);
  }

  // Hide active donations for suspended or banned users
  if (status === 'SUSPENDED' || status === 'BANNED') {
    await pool.query(
      `UPDATE donations
       SET status = 'HIDDEN', updated_at = NOW()
       WHERE donor_user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
  }

  // Audit (fire-and-forget no PII; reason is admin-entered, acceptable)
  AuditLog.create({
    user_id:    adminUserId,
    action:     'USER_STATUS_UPDATED',
    resource:   'users',
    ip_address: ipAddress || null,
    outcome:    'SUCCESS',
    meta:       { target_user_id: userId, new_status: status, reason },
  });

  return updatedUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// listDonations (admin view all statuses)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin view of all donations regardless of status.
 * Joins donor display_name from donors table.
 * @param {{ status?: string, donor_id?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ rows: object[], total: number, page: number, limit: number }>}
 */
async function listDonations({ status, donor_id, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['d.deleted_at IS NULL'];

  if (status) {
    params.push(status);
    conditions.push(`d.status = $${params.length}`);
  }
  if (donor_id) {
    params.push(donor_id);
    conditions.push(`d.donor_user_id = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const filterParamCount = params.length;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM donations d ${where}`,
    params.slice(0, filterParamCount)
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT d.*, dn.display_name AS donor_name, dn.display_name AS donor_display_name
     FROM donations d
     LEFT JOIN donors dn ON dn.user_id = d.donor_user_id
     ${where}
     ORDER BY d.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total, page, limit };
}

// ─────────────────────────────────────────────────────────────────────────────
// hideDonation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin: set a donation status to HIDDEN.
 * @param {string} donationId
 * @param {string} reason
 * @param {string} adminUserId
 * @param {string|null} ipAddress
 * @returns {Promise<object>} Updated donation row
 */
async function hideDonation(donationId, reason, adminUserId, ipAddress) {
  const result = await pool.query(
    `UPDATE donations
     SET status = 'HIDDEN', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [donationId]
  );

  if (result.rowCount === 0) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  AuditLog.create({
    user_id:    adminUserId,
    action:     'DONATION_HIDDEN',
    resource:   'donations',
    ip_address: ipAddress || null,
    outcome:    'SUCCESS',
    meta:       { donation_id: donationId, reason },
  });

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// reinstateDonation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin: reinstate a HIDDEN donation to ACTIVE.
 * Blocked if there are open CRITICAL or HIGH severity reports.
 * @param {string} donationId
 * @param {string} adminUserId
 * @param {string|null} ipAddress
 * @returns {Promise<object>} Updated donation row
 */
async function reinstateDonation(donationId, adminUserId, ipAddress) {
  // Load donation
  const donationResult = await pool.query(
    'SELECT * FROM donations WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
    [donationId]
  );
  if (!donationResult.rows[0]) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  // Check for open critical/high reports
  const reportsResult = await pool.query(
    `SELECT COUNT(*) AS count
     FROM reports
     WHERE donation_id = $1
       AND status = 'OPEN'
       AND severity IN ('CRITICAL', 'HIGH')`,
    [donationId]
  );
  if (parseInt(reportsResult.rows[0].count, 10) > 0) {
    throw serviceError(
      'Cannot reinstate: open critical or high severity reports exist for this donation.',
      'OPEN_CRITICAL_REPORTS_EXIST',
      409
    );
  }

  const result = await pool.query(
    `UPDATE donations
     SET status = 'ACTIVE', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [donationId]
  );

  AuditLog.create({
    user_id:    adminUserId,
    action:     'DONATION_REINSTATED',
    resource:   'donations',
    ip_address: ipAddress || null,
    outcome:    'SUCCESS',
    meta:       { donation_id: donationId },
  });

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated admin view of audit logs.
 * @param {{ action?: string, user_id?: string, from?: string, to?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ rows: object[], total: number, page: number, limit: number }>}
 */
async function getAuditLogs({ action, user_id, from, to, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (user_id) {
    params.push(user_id);
    conditions.push(`user_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const filterParamCount = params.length;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM audit_logs ${where}`,
    params.slice(0, filterParamCount)
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total, page, limit };
}

/**
 * List pending donor/organization verification requests.
 */
async function listVerificationQueue({ status = 'PENDING', page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * pageLimit;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM verification_requests WHERE status = $1`,
    [status]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const dataRes = await pool.query(
    `SELECT
       vr.id, vr.user_id, vr.type, vr.status, vr.notes, vr.metadata,
       vr.created_at, vr.updated_at,
       u.email, u.full_name, u.role, u.status AS user_status,
       d.business_name, d.business_reg_no,
       o.org_name, o.registration_no, o.website
     FROM verification_requests vr
     JOIN users u ON u.id = vr.user_id
     LEFT JOIN donors d ON d.user_id = vr.user_id
     LEFT JOIN organizations o ON o.user_id = vr.user_id
     WHERE vr.status = $1
     ORDER BY vr.created_at ASC
     LIMIT $2 OFFSET $3`,
    [status, pageLimit, offset]
  );

  return {
    requests: dataRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      total_pages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Review (approve or reject) a verification request.
 */
async function reviewVerificationRequest(requestId, { status, notes }, adminUserId, ipAddress) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query(
      `SELECT * FROM verification_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw serviceError('Verification request not found.', 'REQUEST_NOT_FOUND', 404);
    }

    const updatedRes = await client.query(
      `UPDATE verification_requests
       SET status = $1, notes = COALESCE($2, notes), reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, adminUserId, requestId]
    );

    if (status === 'APPROVED') {
      await client.query(
        `UPDATE donors SET verification_level = 'BUSINESS_VERIFIED', updated_at = NOW() WHERE user_id = $1`,
        [existing.user_id]
      );
      await client.query(
        `UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 AND status = 'PENDING_APPROVAL'`,
        [existing.user_id]
      );
    }

    await client.query('COMMIT');

    AuditLog.create({
      user_id: adminUserId,
      action: 'VERIFICATION_REVIEWED',
      resource: 'verification_requests',
      ip_address: ipAddress || null,
      outcome: 'SUCCESS',
      meta: { request_id: requestId, user_id: existing.user_id, status },
    });

    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List organizations with filters.
 */
async function listOrganizations({ verified, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * pageLimit;

  const conditions = ['u.deleted_at IS NULL'];
  const params = [];

  if (verified !== undefined) {
    params.push(verified === 'true' || verified === true);
    conditions.push(`o.verified = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM organizations o JOIN users u ON u.id = o.user_id ${where}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  params.push(pageLimit, offset);
  const dataRes = await pool.query(
    `SELECT
       o.id, o.user_id, o.org_name, o.registration_no, o.address, o.website,
       o.verified, o.created_at,
       u.email, u.full_name, u.phone, u.status
     FROM organizations o
     JOIN users u ON u.id = o.user_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    organizations: dataRes.rows,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      total_pages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Approve an organization application.
 */
async function approveOrganization(orgId, { notes } = {}, adminUserId, ipAddress) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orgRes = await client.query(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
    const org = orgRes.rows[0];
    if (!org) throw serviceError('Organization not found.', 'ORG_NOT_FOUND', 404);

    await client.query(`UPDATE organizations SET verified = TRUE, updated_at = NOW() WHERE id = $1`, [orgId]);
    await client.query(`UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`, [org.user_id]);

    await client.query('COMMIT');

    AuditLog.create({
      user_id: adminUserId,
      action: 'ORGANIZATION_APPROVED',
      resource: 'organizations',
      ip_address: ipAddress || null,
      outcome: 'SUCCESS',
      meta: { org_id: orgId, user_id: org.user_id, notes },
    });

    return { success: true, org_id: orgId, status: 'ACTIVE' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reject an organization application.
 */
async function rejectOrganization(orgId, { reason } = {}, adminUserId, ipAddress) {
  const orgRes = await pool.query(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
  const org = orgRes.rows[0];
  if (!org) throw serviceError('Organization not found.', 'ORG_NOT_FOUND', 404);

  await pool.query(`UPDATE users SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1`, [org.user_id]);

  AuditLog.create({
    user_id: adminUserId,
    action: 'ORGANIZATION_REJECTED',
    resource: 'organizations',
    ip_address: ipAddress || null,
    outcome: 'SUCCESS',
    meta: { org_id: orgId, user_id: org.user_id, reason },
  });

  return { success: true, org_id: orgId, status: 'REJECTED' };
}

/**
 * Permanently remove/cancel a donation listing by admin.
 */
async function removeDonation(donationId, { reason } = {}, adminUserId, ipAddress) {
  const donation = await pool.query('SELECT id, status FROM donations WHERE id = $1 AND deleted_at IS NULL', [donationId]);
  if (!donation.rows[0]) throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);

  await pool.query(
    `UPDATE donations SET status = 'CANCELLED', deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [donationId]
  );

  // Invalidate any active pending pickups
  await pool.query(
    `UPDATE pickups SET status = 'CANCELLED', updated_at = NOW() WHERE donation_id = $1 AND status = 'PENDING'`,
    [donationId]
  );

  AuditLog.create({
    user_id: adminUserId,
    action: 'DONATION_REMOVED_BY_ADMIN',
    resource: 'donations',
    ip_address: ipAddress || null,
    outcome: 'SUCCESS',
    meta: { donation_id: donationId, reason },
  });

  return { success: true, donation_id: donationId };
}

/**
 * Issue a warning to a donor (deducts 10 points from trust score).
 */
async function warnDonor(donorUserId, { reason } = {}, adminUserId, ipAddress) {
  const donor = await pool.query('SELECT * FROM donors WHERE user_id = $1', [donorUserId]);
  if (!donor.rows[0]) throw serviceError('Donor profile not found.', 'DONOR_NOT_FOUND', 404);

  const newScore = Math.max(0, (donor.rows[0].trust_score ?? 100) - 10);
  await pool.query(
    `UPDATE donors SET trust_score = $1, updated_at = NOW() WHERE user_id = $2`,
    [newScore, donorUserId]
  );

  AuditLog.create({
    user_id: adminUserId,
    action: 'DONOR_WARNED',
    resource: 'donors',
    ip_address: ipAddress || null,
    outcome: 'SUCCESS',
    meta: { donor_user_id: donorUserId, reason, new_trust_score: newScore },
  });

  return { success: true, donor_user_id: donorUserId, trust_score: newScore };
}

module.exports = {
  getDashboardStats,
  listUsers,
  getUser,
  updateUserStatus,
  listDonations,
  hideDonation,
  reinstateDonation,
  getAuditLogs,
  listVerificationQueue,
  reviewVerificationRequest,
  listOrganizations,
  approveOrganization,
  rejectOrganization,
  removeDonation,
  warnDonor,
};
