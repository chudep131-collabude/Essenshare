/**
 * middleware/auth.js
 * JWT authentication, role-based authorisation, and status-gate middleware.
 */

'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * authenticateToken
 * Verifies JWT access token from the Authorization: Bearer <token> header.
 * Attaches decoded payload to req.user on success.
 * Returns 401 if missing, invalid, or expired.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Authentication token required');
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Authentication token has expired');
    }
    return unauthorized(res, 'Invalid authentication token');
  }
}

/**
 * requireRole
 * Factory that returns middleware checking req.user.role against allowed roles.
 * Must be used AFTER authenticateToken.
 * Returns 403 if the user's role is not in the allowed list.
 * @param {...string} roles allowed role names
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return function roleCheck(req, res, next) {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions for this action');
    }

    return next();
  };
}

/**
 * requireStatus
 * Factory that blocks users whose account status is not in the allowed set.
 * Must be used AFTER authenticateToken + requireRole.
 * Returns 403 if the user's status is not permitted.
 * Typical use: requireStatus('ACTIVE') to block SUSPENDED / BANNED users.
 * @param {...string} statuses allowed status values
 * @returns {Function} Express middleware
 */
function requireStatus(...statuses) {
  return function statusCheck(req, res, next) {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }
    if (!statuses.includes(req.user.status)) {
      return forbidden(
        res,
        req.user.status === 'SUSPENDED'
          ? 'Your account has been suspended. Please contact support.'
          : 'Your account is not active.'
      );
    }
    return next();
  };
}

/**
 * attachRecipientSession
 * Reads the recipient session token from the x-session-token header or
 * the recipient_session cookie, resolves it from DB, and attaches the
 * session object to req.recipientSession.
 * Non-blocking: if no session token is present or the session is invalid,
 * req.recipientSession is set to null and the request continues.
 * Use this on routes where a session is optional but useful (e.g. nearby search).
 * For routes that REQUIRE a session, check req.recipientSession in the handler.
 * @returns {Function} Express middleware
 */
function attachRecipientSession() {
  return async function resolveSession(req, res, next) {
    req.recipientSession = null;
    try {
      const header = req.headers.cookie || '';
      const cookieMatch = header
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('recipient_session='));
      const rawToken =
        req.headers['x-session-token'] ||
        (cookieMatch ? decodeURIComponent(cookieMatch.slice('recipient_session='.length)) : null);

      if (rawToken) {
        const RecipientSession = require('../models/RecipientSession');
        const session = await RecipientSession.findByToken(rawToken);
        if (session && RecipientSession.isValid(session)) {
          req.recipientSession = session;
        }
      }
    } catch (_) {
      // Never block the request on session resolution failure
    }
    return next();
  };
}

module.exports = { authenticateToken, requireRole, requireStatus, attachRecipientSession };
