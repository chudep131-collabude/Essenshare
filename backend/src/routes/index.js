/**
 * routes/index.js
 * Central router mounts all domain routers under /api/v1.
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
const notificationsRoutes = require('./notifications.routes');

// ── Root info ───────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  return res.status(200).json({
    name: 'EssenShare API',
    status: 'running',
    version: config.app.version,
    environment: config.env,
    message: 'Backend API is active. Access the web app at http://localhost:3000',
    endpoints: {
      health: '/health',
      api: '/api/v1',
    },
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
const healthHandler = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.env,
  });
};

router.get('/health', healthHandler);
router.get('/api/v1/health', healthHandler);


// ── API v1 routes ─────────────────────────────────────────────────────────────
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/donations', donationsRoutes);
router.use('/api/v1/pickups', pickupsRoutes);
router.use('/api/v1/donors', donorRoutes);
router.use('/api/v1/donor', donorRoutes);
router.use('/api/v1/orgs', orgRoutes);
router.use('/api/v1/org', orgRoutes);
router.use('/api/v1/reports', reportsRoutes);
router.use('/api/v1/impact', impactRoutes);
router.use('/api/v1/admin', adminRoutes);
router.use('/api/v1/notifications', notificationsRoutes);

module.exports = router;
