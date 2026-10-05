/**
 * routes/index.js
 * Central router — mounts all domain routers under /api/v1.
 * Also handles GET /health for uptime checks.
 */

'use strict';

const router = require('express').Router();
const config = require('../config/env');

// Domain routers
const authRoutes = require('./auth.routes');
const donationsRoutes = require('./donations.routes');
const pickupsRoutes = require('./pickups.routes');
const donorRoutes = require('./donor.routes');
const orgRoutes = require('./org.routes');
const reportsRoutes = require('./reports.routes');
const impactRoutes = require('./impact.routes');
const adminRoutes = require('./admin.routes');

// ── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.env,
  });
});

// ── API v1 routes ─────────────────────────────────────────────────────────────
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/donations', donationsRoutes);
router.use('/api/v1/pickups', pickupsRoutes);
router.use('/api/v1/donors', donorRoutes);
router.use('/api/v1/orgs', orgRoutes);
router.use('/api/v1/reports', reportsRoutes);
router.use('/api/v1/impact', impactRoutes);
router.use('/api/v1/admin', adminRoutes);

module.exports = router;
