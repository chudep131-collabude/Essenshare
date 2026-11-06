/**
 * models/Report.js
 * Data-access layer for the reports table.
 * All queries use parameterised placeholders no string concatenation of user input.
 */
'use strict';

const { pool } = require('../config/database');

// Only these fields may be updated after creation.
const UPDATABLE_FIELDS = new Set([
  'status', 'severity', 'resolved_by', 'resolved_at', 'resolution_notes',
]);

/**
 * Insert a new report row.
 * @param {object} data
 * @returns {Promise<object>} Created row
 */
async function create({
  donation_id = null,
  reporter_session_id = null,
  category,
  description = null,
  severity,
  auto_hidden = false,
  ip_address = null,
}) {
  const result = await pool.query(
    `INSERT INTO reports
       (donation_id, reporter_session_id, category, description, severity, auto_hidden, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [donation_id, reporter_session_id, category, description, severity, auto_hidden, ip_address]
  );
  return result.rows[0];
}

/**
 * Find a report by primary key.
 * @param {string} id UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const result = await pool.query(
    'SELECT * FROM reports WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Paginated list of reports for admin.
 * All filter params are optional.
 * @param {{ status?: string, severity?: string, page?: number, limit?: number }} opts
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function findAll({ status, severity, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (severity) {
    params.push(severity);
    conditions.push(`severity = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query uses the same params (no limit/offset needed)
  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM reports ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Data query appends limit + offset
  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total };
}

/**
 * Update allowlisted fields on a report row.
 * Always appends updated_at = NOW().
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<object|null>} Updated row
 */
async function updateById(id, fields) {
  const entries = Object.entries(fields).filter(([k]) => UPDATABLE_FIELDS.has(k));
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
  setClauses.push('updated_at = NOW()');
  const values = entries.map(([, v]) => v);

  const result = await pool.query(
    `UPDATE reports SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

module.exports = { create, findById, findAll, updateById };
