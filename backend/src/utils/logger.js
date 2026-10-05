/**
 * utils/logger.js
 * Winston logger with Console and File transports.
 * Exports logger and maskPII() helper.
 * Never logs PII fields (email, phone, password, token, etc.).
 */

'use strict';

const path = require('path');
const { createLogger, format, transports } = require('winston');

// PII field names that must never appear in logs
const PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'creditCard',
  'cardNumber',
  'ssn',
  'nationalId',
];

/**
 * maskPII — recursively replaces PII fields in an object with '[REDACTED]'.
 * Returns a sanitized shallow copy; does not mutate the original.
 * @param {object} obj
 * @returns {object}
 */
function maskPII(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isPII = PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));
    if (isPII) {
      masked[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      masked[key] = maskPII(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// Determine log level from env (env.js may not be loaded yet when logger initialises)
const logLevel = process.env.LOG_LEVEL || 'info';
const isDev = (process.env.NODE_ENV || 'development') === 'development';

// Shared format: UTC timestamp + level + message
const baseFormat = format.combine(
  format.timestamp({ format: () => new Date().toISOString() }),
  format.errors({ stack: true })
);

// Console format: colourised in dev, JSON in production
const consoleFormat = isDev
  ? format.combine(baseFormat, format.colorize(), format.simple())
  : format.combine(baseFormat, format.json());

const logsDir = path.join(__dirname, '../../logs');

const logger = createLogger({
  level: logLevel,
  format: baseFormat,
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: format.combine(baseFormat, format.json()),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: format.combine(baseFormat, format.json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = { logger, maskPII };
