/**
 * middleware/cors.js
 * Configures CORS based on APP_URL in production, wildcard in development.
 * Credentials: true — allows cookies / auth headers cross-origin.
 */

'use strict';

const cors = require('cors');
const config = require('../config/env');

const corsOptions = {
  origin: config.isProd ? config.app.url : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

module.exports = { corsMiddleware };
