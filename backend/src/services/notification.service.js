/**
 * services/notification.service.js
 * In-app notifications service (Phase 12).
 * Handles persistent notification creation, listing, and read tracking.
 */

'use strict';

const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

function serviceError(message, code, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Create a new notification for a user.
 */
async function createNotification({ userId, type, title, body, data = null }) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, type, title, body, data ? JSON.stringify(data) : null]
    );
    return result.rows[0];
  } catch (err) {
    logger.error('notification.service: failed to create notification', { userId, type, error: err.message });
    return null;
  }
}

/**
 * List paginated notifications for a user.
 */
async function listNotifications(userId, query = {}) {
  const { read, page = 1, limit = 20 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * pageLimit;

  const conditions = [`user_id = $1`];
  const params = [userId];

  if (read === 'false' || read === false) {
    conditions.push('read_at IS NULL');
  } else if (read === 'true' || read === true) {
    conditions.push('read_at IS NOT NULL');
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM notifications ${where}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const unreadCountRes = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  const unreadTotal = parseInt(unreadCountRes.rows[0].count, 10);

  params.push(pageLimit, offset);
  const dataRes = await pool.query(
    `SELECT id, type, title, body, data, read_at, created_at
     FROM notifications
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    notifications: dataRes.rows,
    unread_count: unreadTotal,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      total_pages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Mark a single notification as read.
 */
async function markAsRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING *`,
    [notificationId, userId]
  );
  if (!result.rows[0]) {
    // If already read, return success
    const existing = await pool.query(`SELECT id FROM notifications WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
    if (!existing.rows[0]) throw serviceError('Notification not found.', 'NOT_FOUND', 404);
  }
  return { success: true };
}

/**
 * Mark all unread notifications for a user as read.
 */
async function markAllAsRead(userId) {
  await pool.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return { success: true };
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
};
