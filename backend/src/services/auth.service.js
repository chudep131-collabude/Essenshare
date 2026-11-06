/**
 * services/auth.service.js
 * Core authentication business logic.
 * Framework-agnostic no Express imports.
 *
 * Security rules enforced here:
 *  - Passwords hashed with bcrypt cost factor 12.
 *  - Refresh tokens stored as SHA-256 hashes only.
 *  - OTP codes stored as SHA-256 hashes only.
 *  - No email address values in any logger call.
 *  - No token values in any logger call.
 *  - Email enumeration prevention: login + forgotPassword return
 *    the same error message whether or not the email exists.
 *  - All errors thrown as { message, code, statusCode } objects.
 */

'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ms = require('ms');

const config = require('../config/env');
const { logger } = require('../utils/logger');
const { pool } = require('../config/database');

const User         = require('../models/User');
const Donor        = require('../models/Donor');
const Organization = require('../models/Organization');
const RefreshToken = require('../models/RefreshToken');
const Verification = require('../models/Verification');
const AuditLog     = require('../models/AuditLog');
const emailService = require('./email.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random OTP string.
 * Returns a 6-digit numeric string.
 */
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Hash a value with SHA-256.
 * Used for both OTP codes and refresh tokens raw values are never stored.
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Issue a signed JWT access token.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

/**
 * Issue a signed JWT refresh token (long-lived).
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Build the token pair (access + refresh) for a user.
 * Stores the hashed refresh token in the DB.
 */
async function issueTokenPair(user, ipAddress, userAgent) {
  const tokenPayload = {
    sub: user.id,
    role: user.role,
    status: user.status,
    email_verified: user.email_verified,
  };

  const accessToken  = signAccessToken(tokenPayload);
  const rawRefresh   = signRefreshToken({ sub: user.id });
  const refreshHash  = sha256(rawRefresh);

  // Guard: ms() returns undefined for empty/unparseable strings.
  // Fall back to 7 days (in ms) to prevent Invalid Date from poisoning expires_at.
  const FALLBACK_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const parsedTtl = ms(config.jwt.refreshExpiresIn);
  const refreshTtlMs = (typeof parsedTtl === 'number' && parsedTtl > 0)
    ? parsedTtl
    : FALLBACK_REFRESH_TTL_MS;

  // Refresh token TTL: derived from JWT config to keep DB and JWT in sync
  const expiresAt = new Date(Date.now() + refreshTtlMs);

  await RefreshToken.create({
    user_id:    user.id,
    token_hash: refreshHash,
    expires_at: expiresAt,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  return { accessToken, refreshToken: rawRefresh };
}

/**
 * Create a service-layer error with HTTP status code and machine-readable code.
 */
function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code       = code;
  err.statusCode = statusCode;
  return err;
}

// ── Public service methods ────────────────────────────────────────────────────

/**
 * Register a new user.
 * Creates the user row and the role-specific profile row atomically
 * inside a single DB transaction neither row is committed unless both succeed.
 * Sends an email verification OTP after the transaction commits.
 *
 * @param {object} data - { email, password, role, full_name, phone, country_code, org_name, business_name }
 * @param {string} ipAddress
 * @returns {Promise<{ user: object }>}
 */
async function register(data, ipAddress) {
  const { email, password, role, full_name, phone, country_code, org_name, business_name } = data;

  // Validate org_name BEFORE any DB write to prevent orphaned user rows
  if (role === 'ORGANIZATION' && !org_name) {
    throw serviceError('org_name is required for ORGANIZATION role.', 'ORG_NAME_REQUIRED', 400);
  }

  // Check if email is already taken (outside transaction read-only, no lock needed)
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const existing = await User.findByEmail(normalizedEmail);
  if (existing) {
    if (!existing.email_verified) {
      // The user previously started registration but has not completed email verification.
      // Update their password and profile, issue a fresh OTP, and return dev_otp so they can verify.
      const passwordHash = await bcrypt.hash(password, 12);
      await User.updateById(existing.id, {
        password_hash: passwordHash,
        full_name: full_name || existing.full_name,
        phone: phone || existing.phone,
        country_code: country_code || existing.country_code,
      });

      const otp     = generateOtp();
      const otpHash = sha256(otp);
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await Verification.create({
        user_id:    existing.id,
        type:       'EMAIL_VERIFICATION',
        code_hash:  otpHash,
        expires_at: expires,
      });

      try {
        await emailService.sendVerificationEmail(existing.email, otp, full_name || existing.full_name);
      } catch (emailErr) {
        logger.error('auth.service: verification email failed to dispatch', { userId: existing.id, error: emailErr.message });
      }

      await AuditLog.create({
        user_id:    existing.id,
        action:     'USER_REGISTER_RESUME',
        resource:   'users',
        ip_address: ipAddress,
        outcome:    'SUCCESS',
      });

      const { password_hash: _, ...safeUser } = { ...existing, full_name: full_name || existing.full_name };
      const result = { user: safeUser };
      if (config.isDev) {
        result.dev_otp = otp;
      }
      return result;
    }

    throw serviceError('An account with this email address already exists. Try signing in instead.', 'EMAIL_TAKEN', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Acquire a dedicated client and wrap both INSERTs in a transaction.
  // If the profile row creation fails, the users row is rolled back, freeing the email.
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');

    // INSERT user row parameterised, never log email value
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, country_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, passwordHash, role, full_name || null, phone || null, country_code || null]
    );
    user = userResult.rows[0];

    // INSERT role-specific profile row
    const safetyAccepted = data.safety_accepted !== false;
    if (role === 'INDIVIDUAL_DONOR' || role === 'BUSINESS_DONOR') {
      await client.query(
        `INSERT INTO donors (user_id, display_name, business_name, safety_agreement_accepted_at, safety_agreement_version)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          full_name || null,
          business_name || null,
          safetyAccepted ? new Date() : null,
          safetyAccepted ? '1.0' : null,
        ]
      );
    } else if (role === 'ORGANIZATION') {
      await client.query(
        `INSERT INTO organizations (user_id, org_name)
         VALUES ($1, $2)`,
        [user.id, org_name]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  logger.info('auth.service: user created', { userId: user.id, role });

  // Generate and store OTP (only hash stored) outside transaction; email is now committed
  const otp     = generateOtp();
  const otpHash = sha256(otp);
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await Verification.create({
    user_id:    user.id,
    type:       'EMAIL_VERIFICATION',
    code_hash:  otpHash,
    expires_at: expires,
  });

  // Send email — safely catch dispatch errors so committed account creation is not aborted
  try {
    await emailService.sendVerificationEmail(user.email, otp, user.full_name);
  } catch (emailErr) {
    logger.error('auth.service: verification email failed to dispatch', { userId: user.id, error: emailErr.message });
  }

  await AuditLog.create({
    user_id:    user.id,
    action:     'USER_REGISTER',
    resource:   'users',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
  });

  // Strip sensitive fields before returning
  const { password_hash: _, ...safeUser } = user;
  const result = { user: safeUser };
  if (config.isDev) {
    result.dev_otp = otp;
  }
  return result;
}

/**
 * Authenticate a user and issue token pair.
 * Returns the same error for wrong email or wrong password (enumeration prevention).
 *
 * @param {object} data - { email, password }
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
async function login(data, ipAddress, userAgent) {
  const { email, password } = data;
  const GENERIC_ERROR = 'Invalid email or password.';

  const user = await User.findByEmail(email);

  // Compare password even if user not found to prevent timing attacks
  const dummyHash = '$2a$12$dummyhashfordummypasswordcomparisonabc';
  const passwordMatch = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, dummyHash);

  if (!user || !passwordMatch) {
    await AuditLog.create({
      user_id:    user ? user.id : null,
      action:     'USER_LOGIN_FAILED',
      resource:   'users',
      ip_address: ipAddress,
      outcome:    'FAILURE',
    });
    throw serviceError(GENERIC_ERROR, 'INVALID_CREDENTIALS', 401);
  }

  if (user.status === 'SUSPENDED') {
    throw serviceError('This account has been suspended.', 'ACCOUNT_SUSPENDED', 403);
  }

  if (user.status === 'DELETED') {
    throw serviceError(GENERIC_ERROR, 'INVALID_CREDENTIALS', 401);
  }

  const { accessToken, refreshToken } = await issueTokenPair(user, ipAddress, userAgent);

  logger.info('auth.service: user logged in', { userId: user.id });

  await AuditLog.create({
    user_id:    user.id,
    action:     'USER_LOGIN',
    resource:   'users',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
  });

  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

/**
 * Rotate refresh tokens validates the incoming raw refresh token,
 * revokes it, and issues a new pair.
 *
 * @param {string} rawRefreshToken
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function refreshTokens(rawRefreshToken, ipAddress, userAgent) {
  if (!rawRefreshToken) {
    throw serviceError('Refresh token required.', 'REFRESH_TOKEN_MISSING', 401);
  }

  // Verify JWT signature first
  let decoded;
  try {
    decoded = jwt.verify(rawRefreshToken, config.jwt.refreshSecret);
  } catch {
    throw serviceError('Invalid or expired refresh token.', 'REFRESH_TOKEN_INVALID', 401);
  }

  const tokenHash = sha256(rawRefreshToken);
  const stored    = await RefreshToken.findByHash(tokenHash);

  if (!stored) {
    throw serviceError('Refresh token has been revoked or does not exist.', 'REFRESH_TOKEN_REVOKED', 401);
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw serviceError('User account not found.', 'USER_NOT_FOUND', 401);
  }

  // Revoke old token (rotation)
  await RefreshToken.revoke(tokenHash);

  const tokens = await issueTokenPair(user, ipAddress, userAgent);

  logger.info('auth.service: tokens refreshed', { userId: user.id });

  return tokens;
}

/**
 * Logout revokes the provided refresh token.
 *
 * @param {string} rawRefreshToken
 * @returns {Promise<void>}
 */
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return; // Nothing to revoke

  const tokenHash = sha256(rawRefreshToken);
  await RefreshToken.revoke(tokenHash);

  // Decode without verification to get userId for audit log (token may be expired)
  try {
    const decoded = jwt.decode(rawRefreshToken);
    if (decoded && decoded.sub) {
      logger.info('auth.service: user logged out', { userId: decoded.sub });
      await AuditLog.create({
        user_id:  decoded.sub,
        action:   'USER_LOGOUT',
        resource: 'users',
        outcome:  'SUCCESS',
      });
    }
  } catch {
    // Non-fatal logout still succeeds even if audit log fails
  }
}

/**
 * Verify email with OTP code.
 *
 * @param {object} data - { user_id, otp }
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
async function verifyEmail(data, ipAddress) {
  const { user_id, otp } = data;

  const otpHash = sha256(otp);
  const record  = await Verification.findActiveByUserAndType(user_id, 'EMAIL_VERIFICATION');

  if (!record || record.code_hash !== otpHash) {
    throw serviceError('Invalid or expired verification code.', 'INVALID_OTP', 400);
  }

  await Verification.markUsed(record.id);

  // ORGANIZATION users enter PENDING_APPROVAL after email verification;
  // all other roles become ACTIVE immediately.
  const user = await User.findById(user_id);
  if (!user) {
    throw serviceError('User not found.', 'USER_NOT_FOUND', 404);
  }

  if (user.role === 'ORGANIZATION') {
    await User.updateById(user_id, { email_verified: true, status: 'PENDING_APPROVAL' });
  } else {
    await User.markEmailVerified(user_id);
  }

  logger.info('auth.service: email verified', { userId: user_id });

  await AuditLog.create({
    user_id:    user_id,
    action:     'EMAIL_VERIFIED',
    resource:   'users',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
  });
}

/**
 * Initiate password reset looks up user by email, generates OTP, sends email.
 * Returns the SAME response whether or not the email exists (enumeration prevention).
 *
 * @param {string} email
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
async function initiatePasswordReset(email, ipAddress) {
  const user = await User.findByEmail(email);
  let devOtp;

  if (user) {
    const otp     = generateOtp();
    const otpHash = sha256(otp);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await Verification.create({
      user_id:    user.id,
      type:       'PASSWORD_RESET',
      code_hash:  otpHash,
      expires_at: expires,
    });

    // Never log email address or otp value
    try {
      await emailService.sendPasswordResetEmail(user.email, otp, user.full_name);
    } catch (emailErr) {
      logger.error('auth.service: password reset email failed to dispatch', { userId: user.id, error: emailErr.message });
    }

    logger.info('auth.service: password reset initiated', { userId: user.id });

    await AuditLog.create({
      user_id:    user.id,
      action:     'PASSWORD_RESET_REQUESTED',
      resource:   'users',
      ip_address: ipAddress,
      outcome:    'SUCCESS',
    });

    if (config.isDev) {
      devOtp = otp;
    }
  }
  // Return dev_otp in development mode if user exists, otherwise empty object (preserving enumeration prevention in prod)
  return config.isDev && devOtp ? { dev_otp: devOtp } : {};
}

/**
 * Complete password reset using OTP code.
 *
 * @param {object} data - { otp, new_password }
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
async function resetPassword(data, ipAddress) {
  const { otp, new_password } = data;

  const otpHash = sha256(otp);
  const record  = await Verification.findByHashAndType(otpHash, 'PASSWORD_RESET');

  if (!record) {
    throw serviceError('Invalid or expired reset code.', 'INVALID_RESET_CODE', 400);
  }

  const newHash = await bcrypt.hash(new_password, 12);

  await User.updateById(record.user_id, { password_hash: newHash });
  await Verification.markUsed(record.id);

  // Revoke all existing refresh tokens force re-login
  await RefreshToken.revokeAllForUser(record.user_id);

  logger.info('auth.service: password reset completed', { userId: record.user_id });

  await AuditLog.create({
    user_id:    record.user_id,
    action:     'PASSWORD_RESET_COMPLETED',
    resource:   'users',
    ip_address: ipAddress,
    outcome:    'SUCCESS',
  });
}

/**
 * Resend email verification OTP.
 * Rate-limited to 3 attempts per hour.
 *
 * @param {string} userId
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
async function resendVerification(userId, ipAddress) {
  // Rate-limit check: max 3 verifications per user per hour
  const rateLimitResult = await pool.query(
    `SELECT COUNT(*) AS count FROM verifications
     WHERE user_id = $1
       AND type = $2
       AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId, 'EMAIL_VERIFICATION']
  );

  const count = parseInt(rateLimitResult.rows[0].count, 10);
  if (count >= 3) {
    throw serviceError('Too many verification attempts. Please wait an hour.', 'RESEND_RATE_LIMIT', 429);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw serviceError('User not found.', 'USER_NOT_FOUND', 404);
  }

  if (user.email_verified) {
    throw serviceError('Email is already verified.', 'ALREADY_VERIFIED', 409);
  }

  const otp     = generateOtp();
  const otpHash = sha256(otp);
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await Verification.create({
    user_id:    userId,
    type:       'EMAIL_VERIFICATION',
    code_hash:  otpHash,
    expires_at: expires,
  });

  try {
    await emailService.sendVerificationEmail(user.email, otp, user.full_name);
  } catch (emailErr) {
    logger.error('auth.service: resend verification email failed to dispatch', { userId, error: emailErr.message });
  }

  logger.info('auth.service: verification resent', { userId });
  return config.isDev ? { dev_otp: otp } : {};
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  verifyEmail,
  initiatePasswordReset,
  resetPassword,
  resendVerification,
};
