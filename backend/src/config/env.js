/**
 * config/env.js
 * Loads environment variables via dotenv, validates required vars,
 * and exports a frozen config object. Never logs secret values.
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
];

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info',
  APP_URL: 'http://localhost:3000',
};

function validateEnv() {
  const missing = [];
  const warnings = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      if (process.env.NODE_ENV === 'production') {
        missing.push(key);
      } else {
        warnings.push(key);
        if (DEFAULTS[key]) {
          process.env[key] = DEFAULTS[key];
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[config/env] Missing required environment variables in production: ${missing.join(', ')}`
    );
  }

  if (warnings.length > 0) {
    // Log key names only — never values
    console.warn(
      `[config/env] WARNING: Missing env vars (using defaults for dev): ${warnings.join(', ')}`
    );
  }

  // Log which keys are present — never log values
  const presentKeys = REQUIRED_VARS.filter((k) => !!process.env[k]);
  console.log(`[config/env] Keys present: ${presentKeys.join(', ')}`);
}

validateEnv();

const config = Object.freeze({
  env: process.env.NODE_ENV || DEFAULTS.NODE_ENV,
  port: parseInt(process.env.PORT || DEFAULTS.PORT, 10),
  isDev: (process.env.NODE_ENV || DEFAULTS.NODE_ENV) === 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  logging: {
    level: process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL,
  },
  app: {
    url: process.env.APP_URL || DEFAULTS.APP_URL,
    version: process.env.npm_package_version || '1.0.0',
  },
});

module.exports = config;
