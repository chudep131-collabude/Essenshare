/**
 * utils/response.js
 * Standardised JSON response helpers.
 * Every response follows the envelope: {success, message, data, timestamp, requestId}
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Build the standard response envelope.
 */
function buildEnvelope(success, message, data, requestId) {
  return {
    success,
    message: message || (success ? 'OK' : 'Error'),
    data: data !== undefined ? data : null,
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
}

/**
 * Extract requestId from req if set by middleware, otherwise generate one.
 */
function getRequestId(res) {
  return (res.locals && res.locals.requestId) || uuidv4();
}

// ─── Success responses ───────────────────────────────────────────────────────

/**
 * 200 OK
 */
function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json(buildEnvelope(true, message, data, getRequestId(res)));
}

/**
 * 201 Created
 */
function created(res, data, message = 'Resource created successfully') {
  return res.status(201).json(buildEnvelope(true, message, data, getRequestId(res)));
}

// ─── Client error responses ──────────────────────────────────────────────────

/**
 * 400 Bad Request
 */
function badRequest(res, message = 'Bad request', errors = null) {
  const body = buildEnvelope(false, message, errors, getRequestId(res));
  return res.status(400).json(body);
}

/**
 * 401 Unauthorized
 */
function unauthorized(res, message = 'Authentication required') {
  return res.status(401).json(buildEnvelope(false, message, null, getRequestId(res)));
}

/**
 * 403 Forbidden
 */
function forbidden(res, message = 'Access denied') {
  return res.status(403).json(buildEnvelope(false, message, null, getRequestId(res)));
}

/**
 * 404 Not Found
 */
function notFound(res, message = 'Resource not found') {
  return res.status(404).json(buildEnvelope(false, message, null, getRequestId(res)));
}

// ─── Server error responses ──────────────────────────────────────────────────

/**
 * 500 Internal Server Error
 */
function serverError(res, message = 'Internal server error') {
  return res.status(500).json(buildEnvelope(false, message, null, getRequestId(res)));
}

module.exports = {
  success,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
};
