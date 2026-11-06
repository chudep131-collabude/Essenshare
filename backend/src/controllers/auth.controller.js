/**
 * controllers/auth.controller.js
 * Thin HTTP adapter for auth.service.js.
 * Validates input, calls the service, sets/clears cookies, and formats responses.
 *
 * cookie-parser is NOT installed cookies are read via the getCookie helper.
 * All Joi schemas are exported so auth.routes.js can compose middleware chains.
 */

'use strict';

const Joi    = require('joi');
const config = require('../config/env');
const { created, success, badRequest } = require('../utils/response');
const authService = require('../services/auth.service');

// ── Cookie helper (no cookie-parser dependency) ───────────────────────────────

/**
 * Read a named cookie from the raw Cookie header.
 * @param {object} req - Express request
 * @param {string} name - Cookie name
 * @returns {string|null}
 */
function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// ── Refresh token cookie options ──────────────────────────────────────────────

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   config.isProd,
    // Cross-origin deployments (Vercel ↔ Render) require 'none' + Secure
    // so the browser sends the cookie on cross-site requests with credentials.
    // In local dev (same origin), 'lax' is fine and doesn't require Secure.
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path:     '/',
  };
}

// ── Joi schemas (exported for route middleware chains) ────────────────────────

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
const passwordMessages = {
  'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  'string.min': 'Password must be at least 8 characters.',
};

const registerSchema = Joi.object({
  email:          Joi.string().email().max(255).required(),
  password:       Joi.string().min(8).max(128).pattern(passwordComplexityRegex).required().messages(passwordMessages),
  role:           Joi.string().valid('INDIVIDUAL_DONOR', 'BUSINESS_DONOR', 'ORGANIZATION').required(),
  full_name:      Joi.string().max(255).optional(),
  phone:          Joi.string().max(30).optional(),
  country_code:   Joi.string().length(2).uppercase().optional(),
  org_name:       Joi.string().max(255).when('role', { is: 'ORGANIZATION', then: Joi.required() }),
  business_name:  Joi.string().max(255).optional(),
  safety_accepted: Joi.boolean().optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().max(255).required(),
  password: Joi.string().max(128).required(),
});

const verifyEmailSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  otp:     Joi.string().length(6).pattern(/^\d+$/).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
});

const resetPasswordSchema = Joi.object({
  otp:          Joi.string().length(6).pattern(/^\d+$/).required(),
  new_password: Joi.string().min(8).max(128).pattern(passwordComplexityRegex).required().messages(passwordMessages),
});

const resendVerificationSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body, req.ip);
    return created(res, result, 'Account created. Please check your email to verify your account.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refresh_token', refreshToken, refreshCookieOptions());

    return success(res, { user, accessToken }, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res, next) {
  try {
    const rawRefreshToken = getCookie(req, 'refresh_token');
    await authService.logout(rawRefreshToken);

    // Clear the cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure:   config.isProd,
      sameSite: config.isProd ? 'none' : 'lax',
      path:     '/',
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
async function refreshTokens(req, res, next) {
  try {
    const rawRefreshToken = getCookie(req, 'refresh_token');
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(
      rawRefreshToken,
      req.ip,
      req.headers['user-agent']
    );

    // Rotate cookie
    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions());

    return success(res, { accessToken }, 'Tokens refreshed');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/verify-email
 */
async function verifyEmail(req, res, next) {
  try {
    await authService.verifyEmail(req.body, req.ip);
    return success(res, null, 'Email verified successfully. You can now log in.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    // Always return the same message regardless of whether email exists
    const result = await authService.initiatePasswordReset(req.body.email, req.ip);
    return success(res, result, 'If an account exists with that email, a reset code has been sent.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body, req.ip);
    return success(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/resend-verification
 */
async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerification(req.body.user_id, req.ip);
    return success(res, result, 'Verification email sent. Please check your inbox.');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/sessions
 * Create an anonymous recipient session for food collection.
 */
async function createRecipientSession(req, res, next) {
  try {
    const RecipientSession = require('../models/RecipientSession');
    const { raw_token, session } = await RecipientSession.create({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    const isProd = config.isProd;
    const cookieVal = `recipient_session=${encodeURIComponent(raw_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieVal);

    return created(
      res,
      {
        session_token: raw_token,
        session_id: session.id,
        expires_at: session.expires_at,
      },
      'Anonymous recipient session created'
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  // Handlers
  register,
  login,
  logout,
  refreshTokens,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  createRecipientSession,
  // Schemas
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
};
