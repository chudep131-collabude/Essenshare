/**
 * routes/auth.routes.js
 * Authentication routes — Phase 2 real implementation.
 * All validation uses validateBody() from middleware/validate.js.
 */

'use strict';

const router = require('express').Router();
const { authLimiter } = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');

const {
  register,
  login,
  logout,
  refreshTokens,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} = require('../controllers/auth.controller');

// POST /api/v1/auth/register
router.post('/register', authLimiter, validateBody(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateBody(loginSchema), login);

// POST /api/v1/auth/logout
router.post('/logout', logout);

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, refreshTokens);

// POST /api/v1/auth/verify-email
router.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), resetPassword);

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', authLimiter, validateBody(resendVerificationSchema), resendVerification);

module.exports = router;
