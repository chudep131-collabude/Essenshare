/**
 * middleware/auth.js
 * JWT authentication and role-based authorisation middleware.
 * Does NOT issue tokens — that is Phase 3.
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
 * @param {...string} roles — allowed role names
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

module.exports = { authenticateToken, requireRole };
