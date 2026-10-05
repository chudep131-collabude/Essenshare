/**
 * config/database.js
 * Creates a pg.Pool using DATABASE_URL from config/env.js.
 * Does NOT connect at import time — connection is optional in Phase 1.
 * Exports pool and testConnection() for startup health checks.
 */

'use strict';

const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Emit errors on the pool without crashing the process
pool.on('error', (err) => {
  console.error('[database] Unexpected pg pool error:', err.message);
});

/**
 * testConnection — attempts a single query to verify DB connectivity.
 * Resolves with a status object regardless of outcome (never throws).
 * @returns {Promise<{connected: boolean, message: string}>}
 */
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return { connected: true, message: 'Database connection successful' };
  } catch (err) {
    return {
      connected: false,
      message: `Database connection failed: ${err.message}`,
    };
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, testConnection };
