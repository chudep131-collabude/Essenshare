/**
 * server.js
 * Entry point for the Surplus Redistribution Platform API.
 * Loads env first, then builds the Express app, applies middleware stack,
 * mounts routes, and starts listening.
 *
 * Middleware order:
 *   security headers → rate limit → cors → body parsers →
 *   request logging  → static files → routes → 404 → error handler
 */

'use strict';

// ── [1] ENV must be loaded before anything else ───────────────────────────────
const config = require('./config/env');
console.log('[1] ENV loaded NODE_ENV:', config.env, '| PORT:', config.port);

// ── [2] Logger ────────────────────────────────────────────────────────────────
const { logger } = require('./utils/logger');
console.log('[2] Logger initialized level:', config.logging.level);

const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');

// ── [3] Security middleware ───────────────────────────────────────────────────
const { securityMiddleware } = require('./middleware/security');
console.log('[3] Security middleware loaded (Helmet + CSP + HSTS in prod)');

// ── [4] Rate limiters ─────────────────────────────────────────────────────────
const { generalLimiter } = require('./middleware/rateLimit');
console.log('[4] Rate limiter loaded 100 req/15min general');

// ── [5] CORS ──────────────────────────────────────────────────────────────────
const { corsMiddleware } = require('./middleware/cors');
console.log('[5] CORS configured origin:', config.isProd ? config.app.url : 'Dynamic dev origins (credentials enabled)');

// ── [6] Routes ────────────────────────────────────────────────────────────────
const centralRouter = require('./routes/index');
console.log('[6] Routes mounted (/health, /api/v1/*)');

// ── Handlers ──────────────────────────────────────────────────────────────────
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// ── Build Express app ─────────────────────────────────────────────────────────
const app = express();

// Security headers runs in every environment
app.use(...securityMiddleware);

// CORS must come before rate limiting to allow preflight checks and ensure CORS headers on 429
app.use(corsMiddleware);

// Rate limiting
app.use(generalLimiter);

// Body parsers limit JSON to 10 KB to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging via Morgan
// Skip requests that include coordinate query strings (e.g. ?lat=&lng=) to reduce noise
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => /\b(lat|lng|latitude|longitude)\b/.test(req.query ? new URLSearchParams(req.query).toString() : ''),
  })
);

// ── [7] Static frontend ───────────────────────────────────────────────────────
// Serve frontend/public from the monorepo root if present (otherwise API standalone)
const frontendPath = path.join(__dirname, '../../frontend/public');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log('[7] Static frontend served from:', frontendPath);
} else {
  console.log('[7] Static frontend skipped (standalone API mode)');
}

// ── [8] DB config ─────────────────────────────────────────────────────────────
// Pool is created at import; actual connection is deferred to Phase 2
const { testConnection } = require('./config/database');
console.log('[8] DB config loaded connection deferred to Phase 2');

// ── API routes ────────────────────────────────────────────────────────────────
app.use(centralRouter);

// ── 404 and error handlers must be last ─────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── [9] Start listening ───────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`[9] Server listening on PORT ${config.port} http://localhost:${config.port}`);
  logger.info('Server started', { port: config.port, env: config.env });

  // Async DB check does not block startup; failure is non-fatal in Phase 1
  testConnection().then(({ connected, message }) => {
    if (connected) {
      logger.info('Database connectivity check passed');
      const { startExpiryWorker } = require('./workers/expiryWorker');
      startExpiryWorker();
    } else {
      logger.warn('Database connectivity check: ' + message + ' (non-fatal in Phase 1)');
    }
  });
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[9] Port ${config.port} already in use (dev server active). Attached gracefully.`);
  } else {
    throw err;
  }
});

// Graceful shutdown on SIGTERM / SIGINT
function shutdown(signal) {
  logger.info(`${signal} received shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Surface unhandled promise rejections without crashing silently
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

module.exports = app; // Export for testing
