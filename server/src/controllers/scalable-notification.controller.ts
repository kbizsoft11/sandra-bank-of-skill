import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import * as ScalableNotificationService from '../services/scalable-notification.service';
import { AdminNotificationModel } from '../models/admin-notification.model';

/**
 * GET /scalable-notifications/employee/notifications
 * Get employee notifications with read status (efficient pagination)
 */
export const getEmployeeNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const filter = (req.query.filter as 'recent' | 'unread' | 'read') || 'recent';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  console.log(`📥 Fetching employee notifications - userId: ${userId}, filter: ${filter}, page: ${page}, limit: ${limit}`);

  const data = await ScalableNotificationService.getUserNotificationsScalable(userId, filter, page, limit);

  console.log(`📤 Returning ${data.notifications.length} notifications`);
  return sendResponse(res, 200, 'Notifications retrieved successfully', data);
});

/**
 * GET /scalable-notifications/company/notifications
 * Get company (admin) notifications with read status (efficient pagination)
 */
export const getCompanyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const filter = (req.query.filter as 'recent' | 'unread' | 'read') || 'recent';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  console.log(`📥 Fetching company notifications - userId: ${userId}, filter: ${filter}, page: ${page}, limit: ${limit}`);

  const data = await ScalableNotificationService.getUserNotificationsScalable(userId, filter, page, limit);

  console.log(`📤 Returning ${data.notifications.length} notifications`);
  return sendResponse(res, 200, 'Notifications retrieved successfully', data);
});

/**
 * PUT /scalable-notifications/employee/notifications/:notificationId/read
 * Mark employee notification as read
 */
export const markEmployeeNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const notificationId = Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  if (!notificationId) {
    return sendResponse(res, 400, 'Notification ID is required', null);
  }

  await ScalableNotificationService.markNotificationAsReadScalable(notificationId, userId);

  return sendResponse(res, 200, 'Notification marked as read', null);
});

/**
 * PUT /scalable-notifications/employee/notifications/:notificationId/unread
 * Mark employee notification as unread
 */
export const markEmployeeNotificationAsUnread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const notificationId = Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  if (!notificationId) {
    return sendResponse(res, 400, 'Notification ID is required', null);
  }

  await ScalableNotificationService.markNotificationAsUnreadScalable(notificationId, userId);

  return sendResponse(res, 200, 'Notification marked as unread', null);
});

/**
 * PUT /scalable-notifications/company/notifications/:notificationId/read
 * Mark company (admin) notification as read
 */
export const markCompanyNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const notificationId = Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  if (!notificationId) {
    return sendResponse(res, 400, 'Notification ID is required', null);
  }

  console.log(`✏️ Mark as read request - userId: ${userId}, notificationId: ${notificationId}`);

  await ScalableNotificationService.markNotificationAsReadScalable(notificationId, userId);

  return sendResponse(res, 200, 'Notification marked as read', null);
});

/**
 * PUT /scalable-notifications/company/notifications/:notificationId/unread
 * Mark company (admin) notification as unread
 */
export const markCompanyNotificationAsUnread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const notificationId = Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  if (!notificationId) {
    return sendResponse(res, 400, 'Notification ID is required', null);
  }

  await ScalableNotificationService.markNotificationAsUnreadScalable(notificationId, userId);

  return sendResponse(res, 200, 'Notification marked as unread', null);
});

/**
 * GET /scalable-notifications/employee/unread-count
 * Get unread notification count for employee
 */
export const getEmployeeUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  const count = await ScalableNotificationService.getUnreadNotificationCountScalable(userId);

  return sendResponse(res, 200, 'Unread count retrieved', { unreadCount: count });
});

/**
 * GET /scalable-notifications/company/unread-count
 * Get unread notification count for company
 */
export const getCompanyUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendResponse(res, 401, 'Unauthorized', null);
  }

  const count = await ScalableNotificationService.getUnreadNotificationCountScalable(userId);

  return sendResponse(res, 200, 'Unread count retrieved', { unreadCount: count });
});

/**
 * GET /scalable-notifications/admin/analytics/:notificationId
 * Get notification read analytics (admin only)
 */
export const getNotificationAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  const notificationId = Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId;

  if (userRole !== 'admin') {
    return sendResponse(res, 403, 'Access denied. Admin only.', null);
  }

  if (!notificationId) {
    return sendResponse(res, 400, 'Notification ID is required', null);
  }

  const analytics = await ScalableNotificationService.getNotificationAnalyticsScalable(notificationId);

  return sendResponse(res, 200, 'Analytics retrieved', analytics);
});

/**
 * POST /scalable-notifications/admin/send
 * Send notification to multiple users using scalable approach (admin only)
 */
export const sendNotificationScalable = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  const { title, message, type, targetRecipient, targetCompanyIds, targetEmployeeIds, deliveryMethod, scheduledAt } = req.body;

  if (userRole !== 'admin') {
    return sendResponse(res, 403, 'Access denied. Admin only.', null);
  }

  // Validate required fields
  if (!title || !message) {
    return sendResponse(res, 400, 'Title and message are required', null);
  }

  if (!targetRecipient) {
    return sendResponse(res, 400, 'Target recipient is required', null);
  }

  const isScheduled = deliveryMethod === 'scheduled' && scheduledAt;
  const initialStatus = isScheduled ? 'scheduled' : 'draft';

  const notification = await AdminNotificationModel.create({
    title,
    message,
    type: type || 'info',
    targetRecipient,
    targetCompanyIds: targetRecipient === 'specific_company' ? targetCompanyIds : undefined,
    targetEmployeeIds: targetRecipient === 'specific_employee' ? targetEmployeeIds : undefined,
    deliveryMethod: deliveryMethod || 'now',
    scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
    status: initialStatus,
    createdBy: req.user?.userId,
  });

  // If delivery is immediate, dispatch now using scalable service
  if (deliveryMethod === 'now') {
    try {
      const result = await ScalableNotificationService.dispatchAdminNotificationScalable(notification);
      return sendResponse(res, 201, 'Notification sent successfully', {
        notification,
        dispatch: result,
      });
    } catch (error) {
      console.error('Error dispatching notification:', error);
      return sendResponse(res, 500, 'Notification created but failed to dispatch. Please try again.', notification);
    }
  }

  return sendResponse(res, 201, isScheduled ? 'Notification scheduled successfully' : 'Notification created as draft', notification);
});

/**
 * POST /scalable-notifications/admin/cleanup
 * Cleanup old read receipts (admin only) - run manually or via cron
 */
export const cleanupOldNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  const { daysToKeep = 90 } = req.body;

  if (userRole !== 'admin') {
    return sendResponse(res, 403, 'Access denied. Admin only.', null);
  }

  const result = await ScalableNotificationService.cleanupOldReadReceipts(daysToKeep);

  return sendResponse(res, 200, `Cleanup completed. Deleted ${result.deletedCount} old records.`, result);
});
