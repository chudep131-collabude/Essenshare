const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    UPDATE donations
    SET
      status = 'ACTIVE',
      available_from = NOW() - INTERVAL '1 hour',
      expires_at = NOW() + INTERVAL '5 days'
    WHERE deleted_at IS NULL
  `);
  console.log('Successfully refreshed active donations:', res.rowCount);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
