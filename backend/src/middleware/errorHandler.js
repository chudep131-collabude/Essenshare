/**
 * middleware/errorHandler.js
 * 404 handler and global error handler.
 * Never leaks stack traces in production.
 * Handles Joi and JWT errors with appropriate status codes.
 */

'use strict';

const { logger, maskPII } = require('../utils/logger');
const { notFound, serverError, badRequest, unauthorized } = require('../utils/response');
const config = require('../config/env');

/**
 * notFoundHandler
 * Catches requests that did not match any route and returns 404.
 */
function notFoundHandler(req, res) {
  return notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
}

/**
 * globalErrorHandler
 * Express 4-argument error middleware.
 * - Joi ValidationError → 400
 * - JWT errors → 401
 * - Everything else → 500
 * Never logs PII. Never exposes stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  // Sanitise error context before logging
  const safeBody = maskPII(req.body || {});

  logger.error('Unhandled error', {
    message: err.message,
    name: err.name,
    method: req.method,
    url: req.originalUrl,
    // Log sanitised body never raw body
    body: safeBody,
    statusCode: err.statusCode || 500,
    // Stack only in dev logs
    stack: config.isDev ? err.stack : undefined,
  });

  // Joi validation errors
  if (err.name === 'ValidationError' && err.isJoi) {
    const errors = err.details
      ? err.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
      : [{ message: err.message }];
    return badRequest(res, 'Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return unauthorized(res, 'Invalid authentication token');
  }
  if (err.name === 'TokenExpiredError') {
    return unauthorized(res, 'Authentication token has expired');
  }

  // Service-layer errors: explicit statusCode + code
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'SERVICE_ERROR',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  // Generic server error no stack in production
  const message = config.isDev
    ? `${err.message}${err.stack ? `\n${err.stack}` : ''}`
    : 'Internal server error';

  return serverError(res, message);
}

module.exports = { notFoundHandler, globalErrorHandler };
