/**
 * models/AuditLog.js
 * Fire-and-forget audit log writer.
 * Errors are caught internally — audit failures must never crash the request.
 * All queries use parameterised placeholders.
 * Rows are immutable — no update or delete methods exist.
 */

'use strict';

const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

const AuditLog = {
  /**
   * Write an audit log entry.
   * Safe to call without await — errors are caught and logged internally.
   * @param {object} entry
   * @param {string|null} entry.user_id    - UUID of the acting user (null for anonymous)
   * @param {string}      entry.action     - Action name e.g. 'USER_REGISTER'
   * @param {string|null} entry.resource   - Affected resource e.g. 'users'
   * @param {string|null} entry.ip_address - Requester IP
   * @param {string}      entry.outcome    - 'SUCCESS' | 'FAILURE'
   * @param {object|null} entry.meta       - Non-PII metadata
   * @returns {Promise<void>}
   */
  async create({ user_id = null, action, resource = null, ip_address = null, outcome, meta = null }) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, ip_address, outcome, meta)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id, action, resource, ip_address, outcome, meta ? JSON.stringify(meta) : null]
      );
    } catch (err) {
      // Never rethrow — audit failures must not crash the application
      logger.error('AuditLog.create failed', { action, outcome, error: err.message });
    }
  },
};

module.exports = AuditLog;
