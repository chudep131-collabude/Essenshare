/**
 * middleware/security.js
 * Applies Helmet with a strong CSP and additional security headers.
 * All security middleware runs in every environment never skipped.
 */

'use strict';

const helmet = require('helmet');
const config = require('../config/env');

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://tile.openstreetmap.org'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // X-Content-Type-Options: nosniff
  noSniff: true,
  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // HSTS only in production
  hsts: config.isProd
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-XSS-Protection (legacy browsers)
  xssFilter: true,
  // Hide X-Powered-By
  hidePoweredBy: true,
});

/**
 * securityMiddleware array of middleware to spread into app.use().
 * Exported as array so additional security handlers can be appended.
 */
const securityMiddleware = [helmetMiddleware];

module.exports = { securityMiddleware };
