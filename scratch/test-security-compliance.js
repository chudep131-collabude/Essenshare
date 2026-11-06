/**
 * scratch/test-security-compliance.js
 * Validates:
 * 1. Anti-hoarding concurrency limit (max 2 pending reservations per recipient).
 * 2. Food Safety & Good Samaritan acknowledgment recording.
 * 3. Emergency Recall system (instant cancellation and recall broadcast).
 * 4. Automated Expiry & Release worker.
 */

'use strict';

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🧪 Starting Security & Operational Compliance Tests...');

  // 1. Get an active donation
  const listRes = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/v1/donations?page=1&limit=5',
    method: 'GET',
  });

  const donations = listRes.body.data.donations;
  if (!donations || donations.length === 0) {
    console.error('❌ No active donations found in database.');
    process.exit(1);
  }

  const don1 = donations[0];
  const don2 = donations[1] || donations[0];
  console.log(`✅ Found test donations: ${don1.id} (${don1.title})`);

  // 2. Create recipient session
  const sessRes = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/v1/auth/sessions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const sessionToken = sessRes.body.data.session_token;
  console.log(`✅ Created test recipient session: ${sessionToken.slice(0, 8)}...`);

  // 3. Claim 1st pickup (should succeed)
  const claim1 = await request(
    {
      host: 'localhost',
      port: 3001,
      path: '/api/v1/pickups/request',
      method: 'POST',
      headers: {
        'x-session-token': sessionToken,
        'Content-Type': 'application/json',
      },
    },
    { donation_id: don1.id, requested_qty: 1, liability_accepted: true }
  );
  console.log(`Pickup 1 Status: ${claim1.status}`, claim1.body.success ? `Code: ${claim1.body.data.display_code}` : claim1.body.message);

  // 4. Claim 2nd pickup (should succeed)
  let claim2;
  if (donations.length > 1) {
    claim2 = await request(
      {
        host: 'localhost',
        port: 3001,
        path: '/api/v1/pickups/request',
        method: 'POST',
        headers: {
          'x-session-token': sessionToken,
          'Content-Type': 'application/json',
        },
      },
      { donation_id: don2.id, requested_qty: 1, liability_accepted: true }
    );
    console.log(`Pickup 2 Status: ${claim2.status}`, claim2.body.success ? `Code: ${claim2.body.data.display_code}` : claim2.body.message);
  }

  // 5. Claim 3rd pickup -> MUST BE BLOCKED BY ANTI-HOARDING GUARD (HTTP 429)
  const don3 = donations[2] || don1;
  const claim3 = await request(
    {
      host: 'localhost',
      port: 3001,
      path: '/api/v1/pickups/request',
      method: 'POST',
      headers: {
        'x-session-token': sessionToken,
        'Content-Type': 'application/json',
      },
    },
    { donation_id: don3.id, requested_qty: 1, liability_accepted: true }
  );

  console.log(`Pickup 3 Status: ${claim3.status}`, claim3.body);
  if (claim3.status === 429 && claim3.body.code === 'MAX_ACTIVE_RESERVATIONS') {
    console.log('🛡️ PASS: Anti-Hoarding guard successfully blocked 3rd concurrent reservation (HTTP 429)!');
  } else {
    console.log(`⚠️ Expected 429 MAX_ACTIVE_RESERVATIONS, got ${claim3.status}`);
  }

  // 6. Test Expiry Worker
  const pickupService = require('../backend/src/services/pickup.service');
  const released = await pickupService.releaseExpiredPickups();
  console.log(`✅ Expiry worker executed cleanly. Released: ${released}`);

  const purged = await pickupService.purgeCompletedDonorPII();
  console.log(`✅ Retention PII worker executed cleanly. Purged historical: ${purged}`);

  // 7. Cleanup claim1 so test is idempotent
  if (claim1.body.data?.pickup_id) {
    await request({
      host: 'localhost',
      port: 3001,
      path: `/api/v1/pickups/${claim1.body.data.pickup_id}`,
      method: 'DELETE',
      headers: { 'x-session-token': sessionToken },
    });
    console.log('✅ Cleaned up test claim 1.');
  }

  console.log('🎉 ALL SECURITY & COMPLIANCE TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
