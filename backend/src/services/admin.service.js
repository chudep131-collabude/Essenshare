/**
 * services/admin.service.js
 * Admin management operations.
 * Framework-agnostic — no Express imports.
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
  const conditions = ['deleted_at IS NULL'];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
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

  // Counts — run in parallel
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
  // Load target user (includes password_hash — we strip before returning)
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

  // Audit (fire-and-forget — no PII; reason is admin-entered, acceptable)
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
// listDonations (admin view — all statuses)
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
    `SELECT d.*, dn.display_name AS donor_display_name
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

module.exports = {
  getDashboardStats,
  listUsers,
  getUser,
  updateUserStatus,
  listDonations,
  hideDonation,
  reinstateDonation,
  getAuditLogs,
};
