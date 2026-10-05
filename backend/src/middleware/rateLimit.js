/**
 * middleware/rateLimit.js
 * Two rate limiters:
 *   generalLimiter — 100 req / 15 min per IP
 *   authLimiter    — 10 req  / 15 min per IP (for auth routes)
 */

'use strict';

const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    data: null,
  },
  handler(req, res, next, options) {
    res.status(options.statusCode).json(options.message);
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
    data: null,
  },
  handler(req, res, next, options) {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { generalLimiter, authLimiter };
