/**
 * services/report.service.js
 * Business logic for safety reports.
 * Framework-agnostic — no Express imports.
 * AuditLog.create is always fire-and-forget (never awaited).
 */
'use strict';

const { pool } = require('../config/database');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const RecipientSession = require('../models/RecipientSession');

// ── Error factory ─────────────────────────────────────────────────────────────

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

// ── Category → severity map ───────────────────────────────────────────────────

const CATEGORY_SEVERITY = {
  UNSAFE_FOOD:          'CRITICAL',
  WRONG_ALLERGEN_INFO:  'CRITICAL',
  COLD_CHAIN_CONCERN:   'CRITICAL',
  SPOILED_OR_EXPIRED:   'HIGH',
  DONOR_MISCONDUCT:     'HIGH',
  WRONG_DESCRIPTION:    'MEDIUM',
  ALREADY_GONE:         'MEDIUM',
  OTHER:                'LOW',
};

// ─────────────────────────────────────────────────────────────────────────────
// submitReport
// Public — no authentication required. Rate-limited by IP via DB query.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a safety report against a donation.
 * @param {{ donation_id: string, category: string, description?: string }} data
 * @param {string|null} rawSessionToken  Value from req.headers['x-session-token']
 * @param {string|null} ipAddress
 * @returns {Promise<{ report_id: string, message: string }>}
 */
async function submitReport(data, rawSessionToken, ipAddress) {
  const { donation_id, category, description } = data;

  // 1. IP rate limit — max 5 reports per IP per hour
  if (ipAddress) {
    const rateResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM reports
       WHERE ip_address = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipAddress]
    );
    if (parseInt(rateResult.rows[0].count, 10) >= 5) {
      throw serviceError(
        'Too many reports submitted from this IP. Please try again later.',
        'REPORT_RATE_LIMITED',
        429
      );
    }
  }

  // 2. Validate donation exists and is not soft-deleted
  const donationResult = await pool.query(
    'SELECT id FROM donations WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
    [donation_id]
  );
  if (donationResult.rows.length === 0) {
    throw serviceError('Donation not found.', 'DONATION_NOT_FOUND', 404);
  }

  // 3. Derive severity from category
  const severity = CATEGORY_SEVERITY[category] || 'LOW';
  const auto_hidden = severity === 'CRITICAL' || severity === 'HIGH';

  // 4. Resolve reporter session (optional — reports allowed without a session)
  let reporter_session_id = null;
  if (rawSessionToken) {
    const session = await RecipientSession.findByToken(rawSessionToken);
    if (session) {
      reporter_session_id = session.id;
    }
  }

  // 5. Auto-hide the donation if severity warrants it
  if (auto_hidden) {
    await pool.query(
      `UPDATE donations SET status = 'HIDDEN', updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [donation_id]
    );
  }

  // 6. Insert report row
  const report = await Report.create({
    donation_id,
    reporter_session_id,
    category,
    description: description || null,
    severity,
    auto_hidden,
    ip_address: ipAddress || null,
  });

  // 7. Audit (fire-and-forget — no PII)
  AuditLog.create({
    user_id:    null,
    action:     'REPORT_SUBMITTED',
    resource:   'reports',
    ip_address: ipAddress || null,
    outcome:    'SUCCESS',
    meta:       { donation_id, category },
  });

  return {
    report_id: report.id,
    message: 'Report submitted. Thank you for helping keep the community safe.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// listReports — admin only (enforced at route level)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List reports with optional filters and pagination.
 * @param {{ status?: string, severity?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ rows: object[], total: number, page: number, limit: number }>}
 */
async function listReports({ status, severity, page = 1, limit = 20 } = {}) {
  const result = await Report.findAll({ status, severity, page, limit });
  return { ...result, page, limit };
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveReport — admin only (enforced at route level)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve or dismiss a report.
 * @param {string} report_id
 * @param {{ status: 'RESOLVED'|'DISMISSED', resolution_notes?: string, restore_donation?: boolean }} data
 * @param {string} adminUserId
 * @param {string|null} ipAddress
 * @returns {Promise<object>} Updated report row
 */
async function resolveReport(report_id, data, adminUserId, ipAddress) {
  // 1. Load report
  const existing = await Report.findById(report_id);
  if (!existing) {
    throw serviceError('Report not found.', 'REPORT_NOT_FOUND', 404);
  }

  // 2. Guard against re-closing an already closed report
  if (existing.status === 'RESOLVED' || existing.status === 'DISMISSED') {
    throw serviceError(
      `Report is already ${existing.status.toLowerCase()}.`,
      'REPORT_ALREADY_CLOSED',
      409
    );
  }

  // 3. Update report
  const report = await Report.updateById(report_id, {
    status:           data.status,
    resolved_by:      adminUserId,
    resolved_at:      new Date(),
    resolution_notes: data.resolution_notes || null,
  });

  // 4. Optionally restore the donation if it was auto-hidden
  if (
    data.status === 'RESOLVED' &&
    existing.auto_hidden &&
    data.restore_donation === true &&
    existing.donation_id
  ) {
    await pool.query(
      `UPDATE donations SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1 AND status = 'HIDDEN'`,
      [existing.donation_id]
    );
  }

  // 5. Audit (fire-and-forget — no PII)
  AuditLog.create({
    user_id:    adminUserId,
    action:     'REPORT_RESOLVED',
    resource:   'reports',
    ip_address: ipAddress || null,
    outcome:    'SUCCESS',
    meta:       { report_id, new_status: data.status },
  });

  return report;
}

module.exports = { submitReport, listReports, resolveReport };
