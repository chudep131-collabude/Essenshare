/**
 * routes/auth.routes.js
 * Authentication routes — Phase 1 stubs.
 * Token issuance and real logic implemented in Phase 3.
 */

'use strict';

const router = require('express').Router();
const { authLimiter } = require('../middleware/rateLimit');
const { created, success } = require('../utils/response');

const STUB_PAYLOAD = { phase: 'Phase 1 stub - not yet implemented' };

// POST /api/v1/auth/register
router.post('/register', authLimiter, (req, res) => {
  return created(res, STUB_PAYLOAD, 'Register stub');
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Login stub');
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Logout stub');
});

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, (req, res) => {
  return success(res, STUB_PAYLOAD, 'Refresh token stub');
});

// POST /api/v1/auth/verify-email
router.post('/verify-email', (req, res) => {
  return success(res, STUB_PAYLOAD, 'Verify email stub');
});

module.exports = router;
