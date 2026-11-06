/**
 * config/migrate.js
 * Migration runner reads all .sql files from backend/migrations/ sorted by
 * numeric prefix, executes each inside a transaction, and records which files
 * have been applied in a schema_migrations table.
 *
 * Usage: node src/config/migrate.js
 * Exits 0 on success, 1 on failure.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// env must load before database
require('./env');
const { pool } = require('./database');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/**
 * Ensure the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL      PRIMARY KEY,
      filename   TEXT        NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Return an array of already-applied migration filenames.
 */
async function getAppliedMigrations(client) {
  const result = await client.query('SELECT filename FROM schema_migrations ORDER BY id');
  return result.rows.map((r) => r.filename);
}

/**
 * Return migration .sql filenames sorted by numeric prefix.
 */
function getPendingFiles(applied) {
  const all = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  return all.filter((f) => !applied.includes(f));
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const pending = getPendingFiles(applied);

    if (pending.length === 0) {
      console.log('[migrate] All migrations already applied. Nothing to do.');
      return;
    }

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filepath, 'utf8');

      console.log(`[migrate] Applying: ${filename}`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        // Record filename only, never log file contents
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`[migrate] Applied: ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        // Log filename and error message never log SQL or user data
        console.error(`[migrate] FAILED: ${filename} ${err.message}`);
        throw err;
      }
    }

    console.log(`[migrate] Done. Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
