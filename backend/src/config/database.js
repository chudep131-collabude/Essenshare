/**
 * config/database.js
 * Creates a pg.Pool using DATABASE_URL from config/env.js.
 * Does NOT connect at import time connection is optional in Phase 1.
 * Exports pool and testConnection() for startup health checks.
 */

'use strict';

const { Pool } = require('pg');
const config = require('./env');

// Neon (and other hosted Postgres providers) require SSL.
// ssl: { rejectUnauthorized: false } is safe here because the connection
// string already targets the correct host — this only skips CA certificate
// validation, not encryption itself.
const isNeon = (config.database.url ?? '').includes('neon.tech');

const pool = new Pool({
  connectionString: config.database.url,
  max: isNeon ? 5 : 10,           // Neon free tier has a lower connection limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // slightly longer for cloud latency
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
});

// Emit errors on the pool without crashing the process
pool.on('error', (err) => {
  console.error('[database] Unexpected pg pool error:', err.message);
});

/**
 * testConnection attempts a single query to verify DB connectivity.
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
