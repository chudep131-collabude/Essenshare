/**
 * workers/expiryWorker.js
 * Automated background worker that handles:
 * 1. Releasing expired PENDING pickups back to the available donation inventory (every 60 seconds).
 * 2. Purging sensitive donor PII from pickups completed more than 7 days ago (every 1 hour).
 */

'use strict';

const pickupService = require('../services/pickup.service');
const donationService = require('../services/donation.service');
const { logger } = require('../utils/logger');

let expiryTimer = null;
let listingExpiryTimer = null;
let piiTimer = null;

function startExpiryWorker() {
  if (expiryTimer) return;

  logger.info('[Worker] Initializing Automated Expiry & Data Retention Workers...');

  // 1. Release expired pickups every 60 seconds
  expiryTimer = setInterval(async () => {
    try {
      const released = await pickupService.releaseExpiredPickups();
      if (released > 0) {
        logger.info(`[Worker] Auto-released ${released} expired pickup(s) back to inventory.`);
      }
    } catch (err) {
      logger.error('[Worker] Expiry release worker error', { error: err.message });
    }
  }, 60 * 1000);
  expiryTimer.unref(); // Allow graceful process shutdown

  // 2. Mark expired donation listings every 5 minutes
  listingExpiryTimer = setInterval(async () => {
    try {
      const result = await donationService.markExpiredDonations();
      if (result.expired_donations_count > 0) {
        logger.info(`[Worker] Auto-expired ${result.expired_donations_count} donation listing(s) and invalidated ${result.expired_pickups_count} pending pickup(s).`);
      }
    } catch (err) {
      logger.error('[Worker] Listing expiry worker error', { error: err.message });
    }
  }, 5 * 60 * 1000);
  listingExpiryTimer.unref();

  // 3. Data retention: purge completed donor PII every 1 hour
  piiTimer = setInterval(async () => {
    try {
      const purged = await pickupService.purgeCompletedDonorPII();
      if (purged > 0) {
        logger.info(`[Worker] Purged donor PII from ${purged} completed historical donation(s).`);
      }
    } catch (err) {
      logger.error('[Worker] PII retention worker error', { error: err.message });
    }
  }, 60 * 60 * 1000);
  piiTimer.unref();

  // Run initial pass after 5 seconds
  setTimeout(async () => {
    try {
      await pickupService.releaseExpiredPickups();
      await donationService.markExpiredDonations();
      await pickupService.purgeCompletedDonorPII();
    } catch (err) {
      // non-blocking
    }
  }, 5000).unref();
}

function stopExpiryWorker() {
  if (expiryTimer) clearInterval(expiryTimer);
  if (listingExpiryTimer) clearInterval(listingExpiryTimer);
  if (piiTimer) clearInterval(piiTimer);
  expiryTimer = null;
  listingExpiryTimer = null;
  piiTimer = null;
}

module.exports = {
  startExpiryWorker,
  stopExpiryWorker,
};
