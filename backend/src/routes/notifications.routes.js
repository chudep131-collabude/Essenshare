/**
 * routes/notifications.routes.js
 * In-app notification routes (Phase 12).
 * All routes require authentication.
 */

'use strict';

const router = require('express').Router();
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validate');
const { success } = require('../utils/response');
const notificationService = require('../services/notification.service');

const listNotificationsQuerySchema = Joi.object({
  read: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// GET /api/v1/notifications
router.get('/', authenticateToken, validateQuery(listNotificationsQuerySchema), async (req, res, next) => {
  try {
    const result = await notificationService.listNotifications(req.user.sub, req.query);
    return success(res, result, 'Notifications retrieved.');
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.sub);
    return success(res, result, 'Notification marked as read.');
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/notifications/mark-all-read
router.post('/mark-all-read', authenticateToken, async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.sub);
    return success(res, result, 'All notifications marked as read.');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
