/**
 * services/email.service.js
 * Nodemailer-based transactional email sender.
 * SMTP configuration is read directly from process.env (not from the frozen
 * config object — SMTP keys are not exposed there).
 *
 * Security rules:
 *  - Never log the recipient address or token/code values.
 *  - Only log { type, recipientMasked: true } to confirm dispatch.
 *  - If SMTP config is incomplete, a no-op is returned with a warning.
 */

'use strict';

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

/**
 * Lazily create the transporter on first use so that missing SMTP vars
 * only produce a warning at call time, not at module load.
 */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

  const missingKeys = [];
  if (!smtpHost) missingKeys.push('SMTP_HOST');
  if (!smtpUser) missingKeys.push('SMTP_USER');
  if (!smtpPass) missingKeys.push('SMTP_PASS');

  if (missingKeys.length > 0) {
    // Log key names only — never log values
    logger.warn('email.service: SMTP keys not set — emails will be skipped', {
      missingKeys,
    });
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  // Store from address for reuse
  _transporter._fromAddress = smtpFrom;

  return _transporter;
}

/**
 * Send an email verification OTP to a newly registered user.
 * @param {string} to        - Recipient email (not logged)
 * @param {string} otp       - Plain OTP code (not logged)
 * @param {string} fullName  - Recipient display name
 * @returns {Promise<void>}
 */
async function sendVerificationEmail(to, otp, fullName) {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured — skip silently

  const from = transporter._fromAddress;
  const subject = 'Verify your EssenShare account';
  const html = `
    <p>Hello ${escapeHtml(fullName || 'there')},</p>
    <p>Welcome to EssenShare. Use the code below to verify your email address.
       It expires in <strong>15 minutes</strong>.</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${escapeHtml(otp)}</p>
    <p>If you did not create an account, you can safely ignore this email.</p>
    <p>— The EssenShare Team</p>
  `;

  try {
    await transporter.sendMail({ from, to, subject, html });
    // Log dispatch metadata only — never log to address or otp value
    logger.info('email.service: verification email dispatched', { type: 'EMAIL_VERIFICATION', recipientMasked: true });
  } catch (err) {
    logger.error('email.service: failed to send verification email', { type: 'EMAIL_VERIFICATION', error: err.message });
    throw err;
  }
}

/**
 * Send a password-reset OTP to the requesting user.
 * @param {string} to        - Recipient email (not logged)
 * @param {string} otp       - Plain OTP code (not logged)
 * @param {string} fullName  - Recipient display name
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, otp, fullName) {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured — skip silently

  const from = transporter._fromAddress;
  const subject = 'Reset your EssenShare password';
  const html = `
    <p>Hello ${escapeHtml(fullName || 'there')},</p>
    <p>We received a request to reset your EssenShare password. Use the code below.
       It expires in <strong>15 minutes</strong>.</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${escapeHtml(otp)}</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    <p>— The EssenShare Team</p>
  `;

  try {
    await transporter.sendMail({ from, to, subject, html });
    // Log dispatch metadata only — never log to address or otp value
    logger.info('email.service: password reset email dispatched', { type: 'PASSWORD_RESET', recipientMasked: true });
  } catch (err) {
    logger.error('email.service: failed to send password reset email', { type: 'PASSWORD_RESET', error: err.message });
    throw err;
  }
}

/**
 * Minimal HTML escaping to prevent XSS in email templates.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
