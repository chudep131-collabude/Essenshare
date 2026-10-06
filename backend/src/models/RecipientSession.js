/**
 * models/RecipientSession.js
 * Anonymous recipient session management.
 * Session tokens are stored as SHA-256 hashes — raw token is returned once and never stored.
 * All queries use parameterised placeholders.
 */

'use strict';

const crypto = require('crypto');
const { pool } = require('../config/database');

const SESSION_TTL_HOURS = 24;

const RecipientSession = {
  /**
   * Create a new anonymous recipient session.
   * @param {{ ip_address?: string|null, user_agent?: string|null }} opts
   * @returns {Promise<{ session_id: string, raw_token: string, session: object }>}
   */
  async create({ ip_address = null, user_agent = null }) {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO recipient_sessions (session_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tokenHash, ip_address, user_agent, expiresAt]
    );

    return {
      session_id: result.rows[0].id,
      raw_token: rawToken,
      session: result.rows[0],
    };
  },

  /**
   * Find a session by the raw (unhashed) token.
   * @param {string} rawToken
   * @returns {Promise<object|null>}
   */
  async findByToken(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const result = await pool.query(
      `SELECT * FROM recipient_sessions WHERE session_token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  /**
   * Check whether a session row is still valid (not expired).
   * @param {object|null} row
   * @returns {boolean}
   */
  isValid(row) {
    if (!row) return false;
    return new Date(row.expires_at) > new Date();
  },

  /**
   * Extend an existing session's expiry by 24 hours from now.
   * @param {string} id UUID
   * @returns {Promise<object|null>}
   */
  async extend(id) {
    const result = await pool.query(
      `UPDATE recipient_sessions
       SET expires_at = NOW() + INTERVAL '24 hours'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = RecipientSession;
