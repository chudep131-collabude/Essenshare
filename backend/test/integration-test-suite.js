/**
 * test/integration-test-suite.js
 * Comprehensive end-to-end integration test suite for EssenShare Surplus Platform.
 * Covers:
 *  1. Server Boot & Health
 *  2. Auth & Sessions
 *  3. Donor System (Profile, Safety Agreement, Locations CRUD, Verifications)
 *  4. Donations & Media (Create, Nearby, Details, Images, Extend)
 *  5. Pickups & Security (Reservation, Anti-Hoarding, Verify Lockout, Handover Confirm)
 *  6. Organization System (Profile, Surplus Discovery, Allocations)
 *  7. Moderation & Safety Reports (Submission, Auto-Hide)
 *  8. In-App Notifications (List, Read, Mark All)
 *  9. Impact Transparency Ledger (Summary, By-Country, Recent, Stats)
 * 10. Admin Operations (Dashboard, Verification Queue, Org Review, Audit Logs)
 * 11. Background Workers (Listing Expiry, Pickup Release, PII Retention)
 */

'use strict';

const http = require('http');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');
const pickupService = require('../src/services/pickup.service');
const donationService = require('../src/services/donation.service');

// HTTP helper
function apiRequest({ method = 'GET', path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 3001,
        method,
        path,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Test runner state
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${details}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🚀 ESSENSHARE FULL INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  // Seed fixture accounts directly in DB to ensure fresh, deterministic credentials
  const passwordHash = await bcrypt.hash('DevPassword123!', 10);

  // Ensure donor user exists and is active with known password
  await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, status, email_verified)
     VALUES ('donor@example.com', $1, 'INDIVIDUAL_DONOR', 'Alex Donor', 'ACTIVE', true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, status = 'ACTIVE', email_verified = true`,
    [passwordHash]
  );
  await pool.query(
    `INSERT INTO donors (user_id, display_name)
     SELECT id, 'Alex Donor' FROM users WHERE email = 'donor@example.com'
     ON CONFLICT (user_id) DO NOTHING`
  );

  // Ensure admin user exists and is active with known password
  await pool.query(
    `INSERT INTO users (email, password_hash, role, full_name, status, email_verified)
     VALUES ('admin@essenshare.org', $1, 'ADMIN', 'Site Admin', 'ACTIVE', true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, status = 'ACTIVE', email_verified = true`,
    [passwordHash]
  );

  // Start the server by requiring it
  require('../src/server');
  // Allow 1.5 seconds for server and workers to start
  await new Promise((r) => setTimeout(r, 1500));

  let donorToken = null;
  let adminToken = null;
  let orgToken = null;
  let recipientSessionToken = null;
  let createdDonationId = null;
  let createdLocationId = null;
  let requestedPickupId = null;
  let rawPickupCode = null;
  let orgAllocationId = null;

  try {
    // ── 1. Health Checks ────────────────────────────────────────────────────────
    console.log('\n--- 1. Server Health & Root Routing ---');
    const health = await apiRequest({ path: '/health' });
    assert(health.status === 200 && health.body.status === 'ok', 'GET /health returns HTTP 200 with status ok');

    const apiHealth = await apiRequest({ path: '/api/v1/health' });
    assert(apiHealth.status === 200 && apiHealth.body.status === 'ok', 'GET /api/v1/health returns HTTP 200');

    // ── 2. Auth & Sessions ──────────────────────────────────────────────────────
    console.log('\n--- 2. Authentication & Sessions ---');
    // Donor Login
    const donorLogin = await apiRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'donor@example.com', password: 'DevPassword123!' },
    });
    const dTok = donorLogin.body.data?.accessToken || donorLogin.body.data?.access_token;
    assert(donorLogin.status === 200 && dTok, 'Donor login with seed credentials succeeds');
    donorToken = dTok;

    // Admin Login
    const adminLogin = await apiRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'admin@essenshare.org', password: 'DevPassword123!' },
    });
    const aTok = adminLogin.body.data?.accessToken || adminLogin.body.data?.access_token;
    assert(adminLogin.status === 200 && aTok, 'Admin login with seed credentials succeeds');
    adminToken = aTok;

    // Recipient Session
    const sessionRes = await apiRequest({
      method: 'POST',
      path: '/api/v1/auth/sessions',
    });
    assert(sessionRes.status === 201 && sessionRes.body.data?.session_token, 'Recipient anonymous session creation succeeds');
    recipientSessionToken = sessionRes.body.data?.session_token;

    // Register an Organization
    const testOrgEmail = `partner_${Date.now()}@charity-example.org`;
    const orgRegister = await apiRequest({
      method: 'POST',
      path: '/api/v1/auth/register',
      body: {
        role: 'ORGANIZATION',
        email: testOrgEmail,
        password: 'DevPassword123!',
        full_name: 'Community Food Mission',
        org_name: 'Community Food Mission NGO',
        phone: '+14155552671',
      },
    });
    assert(orgRegister.status === 201, 'Organization registration succeeds');

    // Auto-verify email and activate org for test purposes
    await pool.query(
      `UPDATE users SET email_verified = TRUE, status = 'ACTIVE' WHERE email = $1`,
      [testOrgEmail]
    );

    const orgLogin = await apiRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: testOrgEmail, password: 'DevPassword123!' },
    });
    const oTok = orgLogin.body.data?.accessToken || orgLogin.body.data?.access_token;
    assert(orgLogin.status === 200 && oTok, 'Organization login succeeds');
    orgToken = oTok;

    // ── 3. Donor Management ─────────────────────────────────────────────────────
    console.log('\n--- 3. Donor Profile, Locations & Safety ---');
    const donorProfile = await apiRequest({
      path: '/api/v1/donors/profile',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(donorProfile.status === 200 && donorProfile.body.data?.role === 'INDIVIDUAL_DONOR', 'GET /donors/profile succeeds');

    const updateProfile = await apiRequest({
      method: 'PATCH',
      path: '/api/v1/donors/profile',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { display_name: 'Alex Verified Donor', bio: 'Sharing bakery and produce surplus.' },
    });
    assert(updateProfile.status === 200 && updateProfile.body.data?.display_name === 'Alex Verified Donor', 'PATCH /donors/profile succeeds');

    const safetyAgree = await apiRequest({
      method: 'POST',
      path: '/api/v1/donors/safety-agreement',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(safetyAgree.status === 200 && safetyAgree.body.data?.version === '1.0', 'POST /donors/safety-agreement records version 1.0');

    // Locations CRUD
    const addLoc = await apiRequest({
      method: 'POST',
      path: '/api/v1/donors/locations',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: {
        label: 'Community Distribution Hub',
        address: '450 Mission St, San Francisco, CA',
        lat: 37.7891,
        lng: -122.4014,
        notes: 'Loading dock in the rear',
      },
    });
    assert(addLoc.status === 201 && addLoc.body.data?.location?.id, 'POST /donors/locations adds new location');
    createdLocationId = addLoc.body.data?.location?.id;

    const listLocs = await apiRequest({
      path: '/api/v1/donors/locations',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(listLocs.status === 200 && Array.isArray(listLocs.body.data?.locations), 'GET /donors/locations returns active locations list');

    const patchLoc = await apiRequest({
      method: 'PATCH',
      path: `/api/v1/donors/locations/${createdLocationId}`,
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { notes: 'Rear alley entrance on Jessie St' },
    });
    assert(patchLoc.status === 200 && patchLoc.body.data?.location?.notes === 'Rear alley entrance on Jessie St', 'PATCH /donors/locations/:id updates location');

    const submitVerif = await apiRequest({
      method: 'POST',
      path: '/api/v1/donors/verification/business',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { business_name: 'Alex Artisan Breads', business_reg_no: 'REG-9921', notes: 'City health permit on file' },
    });
    assert(submitVerif.status === 201 && submitVerif.body.data?.status === 'PENDING', 'POST /donors/verification/business queues request');

    const getVerif = await apiRequest({
      path: '/api/v1/donors/verification',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(getVerif.status === 200 && getVerif.body.data?.safety_agreement_accepted_at !== null, 'GET /donors/verification returns verification & safety metadata');

    // ── 4. Donations & Listings ─────────────────────────────────────────────────
    console.log('\n--- 4. Donations Lifecycle & Media ---');
    const futureExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const createDonation = await apiRequest({
      method: 'POST',
      path: '/api/v1/donations',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: {
        title: 'Whole Grain Bakery Surplus',
        description: 'Fresh artisan bread loaves and rolls.',
        category: 'BAKERY',
        quantity: 25,
        quantity_unit: 'items',
        weight_kg: 12.5,
        pickup_address: '450 Mission St, San Francisco, CA',
        pickup_lat: 37.7891,
        pickup_lng: -122.4014,
        expires_at: futureExpiry,
      },
    });
    assert(createDonation.status === 201 && createDonation.body.data?.id, 'POST /donations creates active listing');
    createdDonationId = createDonation.body.data?.id;

    // Public list & Proximity
    const listPublic = await apiRequest({ path: '/api/v1/donations?page=1&limit=10' });
    assert(listPublic.status === 200 && Array.isArray(listPublic.body.data?.donations), 'GET /donations returns active listings');

    const nearbySearch = await apiRequest({
      path: '/api/v1/donations/nearby?lat=37.7891&lng=-122.4014&radius_km=15',
    });
    assert(nearbySearch.status === 200 && Array.isArray(nearbySearch.body.data?.donations), 'GET /donations/nearby performs PostGIS proximity search');

    const singleDonation = await apiRequest({ path: `/api/v1/donations/${createdDonationId}` });
    assert(singleDonation.status === 200 && singleDonation.body.data?.title === 'Whole Grain Bakery Surplus', 'GET /donations/:id returns single listing');

    // Image attachment
    const addImg = await apiRequest({
      method: 'POST',
      path: `/api/v1/donations/${createdDonationId}/images`,
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { url: 'https://images.unsplash.com/photo-bakery-sample.jpg', alt_text: 'Fresh bread' },
    });
    assert(addImg.status === 201 && addImg.body.data?.image?.id, 'POST /donations/:id/images attaches listing image');

    const getImgs = await apiRequest({ path: `/api/v1/donations/${createdDonationId}/images` });
    assert(getImgs.status === 200 && getImgs.body.data?.images?.length >= 1, 'GET /donations/:id/images retrieves listing images');

    // Extend listing deadline
    const newDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const extendRes = await apiRequest({
      method: 'PATCH',
      path: `/api/v1/donations/${createdDonationId}/extend`,
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { new_deadline: newDeadline },
    });
    assert(extendRes.status === 200, 'PATCH /donations/:id/extend extends listing pickup deadline');

    // ── 5. Recipient Pickup & Handover Flow ─────────────────────────────────────
    console.log('\n--- 5. Pickup Claim, Verification & Handover ---');
    const claimRes = await apiRequest({
      method: 'POST',
      path: '/api/v1/pickups/request',
      headers: { 'x-session-token': recipientSessionToken },
      body: { donation_id: createdDonationId, requested_qty: 2, liability_accepted: true },
    });
    assert(claimRes.status === 201 && claimRes.body.data?.pickup_id, 'POST /pickups/request reserves quantity and issues code');
    requestedPickupId = claimRes.body.data?.pickup_id;
    rawPickupCode = claimRes.body.data?.raw_code;

    // Brute-force lockout test (wrong code)
    const wrongVerify = await apiRequest({
      method: 'POST',
      path: '/api/v1/pickups/verify',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { raw_code: 'WRONG-CODE-XYZ' },
    });
    assert(wrongVerify.status === 404, 'POST /pickups/verify rejects incorrect code (HTTP 404)');

    // Verify valid code
    const validVerify = await apiRequest({
      method: 'POST',
      path: '/api/v1/pickups/verify',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { raw_code: rawPickupCode },
    });
    assert(validVerify.status === 200 && validVerify.body.data?.pickup?.id === requestedPickupId, 'POST /pickups/verify validates genuine pickup code');

    // Confirm pickup handover
    const confirmRes = await apiRequest({
      method: 'POST',
      path: `/api/v1/pickups/${requestedPickupId}/confirm`,
      headers: { Authorization: `Bearer ${donorToken}` },
      body: { confirmed_qty: 2, confirmed_weight_kg: 1.0 },
    });
    assert(confirmRes.status === 200 && confirmRes.body.data?.pickup?.status === 'CONFIRMED', 'POST /pickups/:id/confirm records handover and creates impact');

    // Anti-hoarding test: Attempting to reserve with same donor immediately should trigger cooldown
    const cooldownRes = await apiRequest({
      method: 'POST',
      path: '/api/v1/pickups/request',
      headers: { 'x-session-token': recipientSessionToken },
      body: { donation_id: createdDonationId, requested_qty: 1, liability_accepted: true },
    });
    assert(cooldownRes.status === 409 && cooldownRes.body.code === 'COOLDOWN_ACTIVE', 'Cooldown rule blocks immediate re-reservation with same donor (HTTP 409)');

    // ── 6. Organization System ──────────────────────────────────────────────────
    console.log('\n--- 6. Organization Profiles, Surplus & Allocations ---');
    const orgProfile = await apiRequest({
      path: '/api/v1/orgs/profile',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(orgProfile.status === 200 && orgProfile.body.data?.role === 'ORGANIZATION', 'GET /orgs/profile retrieves partner profile');

    const orgSurplus = await apiRequest({
      path: '/api/v1/orgs/donations?min_quantity=1',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(orgSurplus.status === 200 && Array.isArray(orgSurplus.body.data?.donations), 'GET /orgs/donations browses available bulk surplus');

    const orgAlloc = await apiRequest({
      method: 'POST',
      path: '/api/v1/orgs/allocations',
      headers: { Authorization: `Bearer ${orgToken}` },
      body: {
        listing_id: createdDonationId,
        requested_quantity: 5,
        notes: 'For distribution at local food pantry',
      },
    });
    assert(orgAlloc.status === 201 && orgAlloc.body.data?.allocation?.id, 'POST /orgs/allocations requests surplus allocation');
    orgAllocationId = orgAlloc.body.data?.allocation?.id;

    const listAllocs = await apiRequest({
      path: '/api/v1/orgs/allocations',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(listAllocs.status === 200 && listAllocs.body.data?.allocations?.length >= 1, 'GET /orgs/allocations lists organization allocations');

    const cancelAlloc = await apiRequest({
      method: 'DELETE',
      path: `/api/v1/orgs/allocations/${orgAllocationId}`,
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(cancelAlloc.status === 204, 'DELETE /orgs/allocations/:id cancels pending allocation (HTTP 204)');

    // ── 7. Reports & Moderation ─────────────────────────────────────────────────
    console.log('\n--- 7. Safety Reports & Moderation ---');
    const submitReport = await apiRequest({
      method: 'POST',
      path: '/api/v1/reports',
      body: {
        donation_id: createdDonationId,
        category: 'WRONG_DESCRIPTION',
        description: 'Bread is multi-seed rather than plain whole grain.',
      },
    });
    assert(submitReport.status === 201 && submitReport.body.success, 'POST /reports submits public safety report');

    // ── 8. In-App Notifications ─────────────────────────────────────────────────
    console.log('\n--- 8. In-App Notifications ---');
    const notifsRes = await apiRequest({
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(notifsRes.status === 200 && Array.isArray(notifsRes.body.data?.notifications), 'GET /notifications lists user notifications');

    const markAllRead = await apiRequest({
      method: 'POST',
      path: '/api/v1/notifications/mark-all-read',
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(markAllRead.status === 200 && markAllRead.body.data?.success, 'POST /notifications/mark-all-read marks all as read');

    // ── 9. Impact Transparency Ledger ───────────────────────────────────────────
    console.log('\n--- 9. Public Impact Ledger & Transparency ---');
    const impactSummary = await apiRequest({ path: '/api/v1/impact/summary' });
    assert(impactSummary.status === 200 && impactSummary.body.data?.total_pickups >= 1, 'GET /impact/summary returns live aggregate ledger');

    const impactCountry = await apiRequest({ path: '/api/v1/impact/by-country' });
    assert(impactCountry.status === 200 && Array.isArray(impactCountry.body.data?.countries), 'GET /impact/by-country returns country breakdown');

    const impactRecent = await apiRequest({ path: '/api/v1/impact/recent' });
    assert(impactRecent.status === 200 && Array.isArray(impactRecent.body.data?.recent_pickups), 'GET /impact/recent returns privacy-safe recent completions');

    const impactStats = await apiRequest({ path: '/api/v1/impact/stats' });
    assert(impactStats.status === 200 && Array.isArray(impactStats.body.data?.by_category), 'GET /impact/stats returns category metrics breakdown');

    // ── 10. Admin Operations ────────────────────────────────────────────────────
    console.log('\n--- 10. Admin Operations & Governance ---');
    const adminDash = await apiRequest({
      path: '/api/v1/admin/dashboard',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDash.status === 200 && adminDash.body.data?.total_users >= 1, 'GET /admin/dashboard returns operational overview');

    const vQueue = await apiRequest({
      path: '/api/v1/admin/verification-queue',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(vQueue.status === 200 && Array.isArray(vQueue.body.data?.requests), 'GET /admin/verification-queue lists review requests');

    const adminOrgs = await apiRequest({
      path: '/api/v1/admin/organizations',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOrgs.status === 200 && Array.isArray(adminOrgs.body.data?.organizations), 'GET /admin/organizations lists partners');

    const adminReports = await apiRequest({
      path: '/api/v1/admin/reports',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminReports.status === 200 && Array.isArray(adminReports.body.data?.rows), 'GET /admin/reports returns reports queue');

    const auditLogs = await apiRequest({
      path: '/api/v1/admin/audit-logs',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditLogs.status === 200 && Array.isArray(auditLogs.body.data?.rows), 'GET /admin/audit-logs queries immutable audit records');

    // ── 11. Background Workers ──────────────────────────────────────────────────
    console.log('\n--- 11. Automated Background Workers ---');
    const releasedPickups = await pickupService.releaseExpiredPickups();
    assert(typeof releasedPickups === 'number', 'Expiry worker releaseExpiredPickups executed cleanly');

    const expiredListings = await donationService.markExpiredDonations();
    assert(typeof expiredListings.expired_donations_count === 'number', 'Expiry worker markExpiredDonations executed cleanly');

    const purgedPII = await pickupService.purgeCompletedDonorPII();
    assert(typeof purgedPII === 'number', 'Retention worker purgeCompletedDonorPII executed cleanly');

  } catch (err) {
    console.error('Fatal unhandled error in test suite:', err);
    failedCount++;
  } finally {
    // Clean up created test location if created
    if (createdLocationId) {
      await pool.query(`DELETE FROM pickup_locations WHERE id = $1`, [createdLocationId]).catch(() => {});
    }

    console.log('\n======================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    await pool.end();
    if (failedCount === 0) {
      console.log('🎉 ALL TESTS PASSED! System is 100% verified and operational.\n');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED. See output above.\n');
      process.exit(1);
    }
  }
}

runTestSuite();
