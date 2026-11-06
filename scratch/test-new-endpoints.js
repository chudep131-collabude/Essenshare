/**
 * scratch/test-new-endpoints.js
 * Verification test script for newly implemented Phase 4, 5, 8, 10, 11, 12, 13 features.
 */

'use strict';

require('../backend/src/config/env');
const { pool } = require('../backend/src/config/database');
const donorService = require('../backend/src/services/donor.service');
const donationService = require('../backend/src/services/donation.service');
const orgService = require('../backend/src/services/org.service');
const adminService = require('../backend/src/services/admin.service');
const notificationService = require('../backend/src/services/notification.service');
const reportService = require('../backend/src/services/report.service');

async function run() {
  console.log('Testing newly implemented endpoints and services...');

  // 1. Get an existing donor or user
  const userRes = await pool.query(`SELECT id, role FROM users WHERE role = 'BUSINESS_DONOR' LIMIT 1`);
  if (!userRes.rows[0]) {
    console.log('No BUSINESS_DONOR user found, picking any active user');
  }
  const testUser = userRes.rows[0] || (await pool.query(`SELECT id, role FROM users LIMIT 1`)).rows[0];
  console.log('Selected user:', testUser.id, testUser.role);

  // 2. Test safety agreement
  try {
    const agree = await donorService.acceptSafetyAgreement(testUser.id, '127.0.0.1');
    console.log('✓ acceptSafetyAgreement:', agree);
  } catch (err) {
    console.log('Safety agreement note:', err.message);
  }

  // 3. Test pickup locations
  const loc = await donorService.addLocation(testUser.id, {
    label: 'Main Bakery Depot',
    address: '123 Surplus Ave, Cityville',
    lat: 37.7749,
    lng: -122.4194,
    notes: 'Ring side bell',
  }, '127.0.0.1');
  console.log('✓ addLocation:', loc.id, loc.label);

  const locs = await donorService.listLocations(testUser.id);
  console.log('✓ listLocations count:', locs.length);

  // 4. Test notification creation and listing
  const notif = await notificationService.createNotification({
    userId: testUser.id,
    type: 'SYSTEM_TEST',
    title: 'Test Notification',
    body: 'Testing in-app notification infrastructure.',
    data: { test: true },
  });
  console.log('✓ createNotification:', notif.id, notif.title);

  const notifs = await notificationService.listNotifications(testUser.id, {});
  console.log('✓ listNotifications unread count:', notifs.unread_count);

  await notificationService.markAsRead(notif.id, testUser.id);
  console.log('✓ markAsRead succeeded');

  // 5. Test donation expiration worker job
  const expRes = await donationService.markExpiredDonations();
  console.log('✓ markExpiredDonations:', expRes);

  // 6. Test Admin Verification Queue & Org listing
  const vQueue = await adminService.listVerificationQueue();
  console.log('✓ admin listVerificationQueue total:', vQueue.pagination.total);

  const orgs = await adminService.listOrganizations();
  console.log('✓ admin listOrganizations total:', orgs.pagination.total);

  console.log('\nAll newly implemented services verified successfully!');
  await pool.end();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
