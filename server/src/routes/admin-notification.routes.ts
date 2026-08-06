import { Router } from 'express';
import * as notificationController from '../controllers/admin-notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Protect all admin notification routes - only admin role
router.use(authenticate);
router.use(allowRoles('admin'));

/**
 * GET /admin/notifications
 * Get all admin notifications (with pagination and filtering)
 */
router.get('/', notificationController.getNotifications);

/**
 * POST /admin/notifications
 * Create a new notification (send now or schedule for later)
 */
router.post('/', notificationController.createNotification);

/**
 * GET /admin/notifications/:id
 * Get a specific notification by ID
 */
router.get('/:id', notificationController.getNotificationById);

/**
 * PUT /admin/notifications/:id
 * Update a notification
 */
router.put('/:id', notificationController.updateNotification);

/**
 * DELETE /admin/notifications/:id
 * Delete a notification
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * POST /admin/notifications/:id/schedule
 * Schedule a notification for later delivery
 */
router.post('/:id/schedule', notificationController.scheduleNotification);

/**
 * POST /admin/notifications/:id/cancel
 * Cancel a scheduled notification
 */
router.post('/:id/cancel', notificationController.cancelScheduledNotification);

export default router;
