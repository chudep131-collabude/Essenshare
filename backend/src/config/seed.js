/**
 * config/seed.js
 * Seed runner reads all .sql files from backend/seeds/ sorted by
 * numeric prefix and executes each inside a transaction.
 *
 * Usage: node src/config/seed.js
 * Exits 0 on success, 1 on failure.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// env must load before database
require('./env');
const { pool } = require('./database');

const SEEDS_DIR = path.join(__dirname, '../../seeds');

/**
 * Return seed .sql filenames sorted by numeric prefix.
 */
function getSeedFiles() {
  return fs
    .readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });
}

async function runSeeds() {
  const client = await pool.connect();
  try {
    const files = getSeedFiles();

    if (files.length === 0) {
      console.log('[seed] No seed files found. Nothing to do.');
      return;
    }

    for (const filename of files) {
      const filepath = path.join(SEEDS_DIR, filename);
      const sql = fs.readFileSync(filepath, 'utf8');

      console.log(`[seed] Running: ${filename}`);

      try {
        await client.query(sql);
        console.log(`[seed] Done: ${filename}`);
      } catch (err) {
        // Log filename and error message never log SQL or user data
        console.error(`[seed] FAILED: ${filename} ${err.message}`);
        throw err;
      }
    }

    console.log(`[seed] Done. Applied ${files.length} seed file(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeeds().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

module.exports = { runSeeds };
