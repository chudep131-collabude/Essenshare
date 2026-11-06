/**
 * middleware/cors.js
 * Configures CORS based on APP_URL in production, wildcard in development.
 * Credentials: true allows cookies / auth headers cross-origin.
 */

'use strict';

const cors = require('cors');
const config = require('../config/env');

const rawOrigins = [
  config.app.url,
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

// Support comma-separated strings like "https://app.vercel.app,https://essenshare.org"
const allowedOrigins = rawOrigins
  .flatMap((o) => o.split(','))
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    if (!config.isProd) {
      // In development, reflect origin so credentials: 'include' works with cookies/tokens
      return callback(null, true);
    }
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    if (
      allowedOrigins.includes(normalizedOrigin) ||
      /\.vercel\.app$/.test(new URL(origin).hostname)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

module.exports = { corsMiddleware };
