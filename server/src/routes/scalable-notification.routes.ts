import { Router } from 'express';
import * as scalableNotificationController from '../controllers/scalable-notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import { requireCompletedOnboarding } from '../middlewares/onboarding.middleware';

const router = Router();

/**
 * Employee Notification Routes
 */

/**
 * GET /scalable-notifications/employee/notifications
 * Get employee notifications with pagination
 */
router.get(
  '/employee/notifications',
  authenticate,
  allowRoles('employee'),
  requireCompletedOnboarding,
  scalableNotificationController.getEmployeeNotifications
);

/**
 * PUT /scalable-notifications/employee/notifications/:notificationId/read
 * Mark employee notification as read
 */
router.put(
  '/employee/notifications/:notificationId/read',
  authenticate,
  allowRoles('employee'),
  scalableNotificationController.markEmployeeNotificationAsRead
);

/**
 * PUT /scalable-notifications/employee/notifications/:notificationId/unread
 * Mark employee notification as unread
 */
router.put(
  '/employee/notifications/:notificationId/unread',
  authenticate,
  allowRoles('employee'),
  scalableNotificationController.markEmployeeNotificationAsUnread
);

/**
 * GET /scalable-notifications/employee/unread-count
 * Get unread notification count
 */
router.get(
  '/employee/unread-count',
  authenticate,
  allowRoles('employee'),
  scalableNotificationController.getEmployeeUnreadCount
);

/**
 * Company Notification Routes
 */

/**
 * GET /scalable-notifications/company/notifications
 * Get company notifications with pagination
 */
router.get(
  '/company/notifications',
  authenticate,
  allowRoles('company'),
  scalableNotificationController.getCompanyNotifications
);

/**
 * PUT /scalable-notifications/company/notifications/:notificationId/read
 * Mark company notification as read
 */
router.put(
  '/company/notifications/:notificationId/read',
  authenticate,
  allowRoles('company'),
  scalableNotificationController.markCompanyNotificationAsRead
);

/**
 * PUT /scalable-notifications/company/notifications/:notificationId/unread
 * Mark company notification as unread
 */
router.put(
  '/company/notifications/:notificationId/unread',
  authenticate,
  allowRoles('company'),
  scalableNotificationController.markCompanyNotificationAsUnread
);

/**
 * GET /scalable-notifications/company/unread-count
 * Get unread notification count
 */
router.get(
  '/company/unread-count',
  authenticate,
  allowRoles('company'),
  scalableNotificationController.getCompanyUnreadCount
);

/**
 * Admin Notification Routes
 */

/**
 * POST /scalable-notifications/admin/send
 * Send notification to multiple users (scalable approach)
 */
router.post(
  '/admin/send',
  authenticate,
  allowRoles('admin'),
  scalableNotificationController.sendNotificationScalable
);

/**
 * GET /scalable-notifications/admin/analytics/:notificationId
 * Get notification read statistics
 */
router.get(
  '/admin/analytics/:notificationId',
  authenticate,
  allowRoles('admin'),
  scalableNotificationController.getNotificationAnalytics
);

/**
 * POST /scalable-notifications/admin/cleanup
 * Cleanup old read receipts
 */
router.post(
  '/admin/cleanup',
  authenticate,
  allowRoles('admin'),
  scalableNotificationController.cleanupOldNotifications
);

export default router;
