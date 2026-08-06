import { Request, Response } from 'express';
import { AdminNotificationModel } from '../models/admin-notification.model';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { dispatchAdminNotificationScalable, processDueScheduledAdminNotificationsScalable } from '../services/scalable-notification.service';

/**
 * GET /admin/notifications
 * Get all admin notifications (paginated)
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, search, page = 1, limit = 10 } = req.query;

  // Process any due scheduled notifications using scalable method
  await processDueScheduledAdminNotificationsScalable().catch(() => {});

  const query: any = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (type && type !== 'all') {
    query.type = type;
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    query.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { message: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
  const skip = (pageNum - 1) * pageSize;

  const [notifications, total] = await Promise.all([
    AdminNotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    AdminNotificationModel.countDocuments(query),
  ]);

  return sendResponse(res, 200, 'Notifications retrieved successfully', {
    data: notifications,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      pages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * GET /admin/notifications/:id
 * Get single notification by ID
 */
export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await AdminNotificationModel.findById(id).lean();

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  return sendResponse(res, 200, 'Notification retrieved successfully', notification);
});

/**
 * POST /admin/notifications
 * Create a new notification (Send now or Schedule)
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, message, type, targetRecipient, targetCompanyIds, targetEmployeeIds, deliveryMethod, scheduledAt } = req.body;

  // Validate required fields
  if (!title || !message) {
    return sendResponse(res, 400, 'Title and message are required', null);
  }

  if (!targetRecipient) {
    return sendResponse(res, 400, 'Target recipient is required', null);
  }

  // Validate specific recipient IDs if provided
  if (targetRecipient === 'specific_company' && (!targetCompanyIds || targetCompanyIds.length === 0)) {
    return sendResponse(res, 400, 'Please select at least one company', null);
  }

  if (targetRecipient === 'specific_employee' && (!targetEmployeeIds || targetEmployeeIds.length === 0)) {
    return sendResponse(res, 400, 'Please select at least one employee', null);
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
    createdBy: user.userId,
  });

  // If delivery is immediate, dispatch now
  if (deliveryMethod === 'now') {
    try {
      await dispatchAdminNotificationScalable(notification);
    } catch (error) {
      console.error('Error dispatching notification:', error);
      // Notification created but dispatch failed - return error
      return sendResponse(
        res,
        500,
        'Notification created but failed to dispatch. Please try again.',
        notification
      );
    }
  }

  return sendResponse(
    res,
    201,
    deliveryMethod === 'now'
      ? 'Notification sent successfully'
      : isScheduled
      ? 'Notification scheduled successfully'
      : 'Notification created as draft',
    notification
  );
});

/**
 * PUT /admin/notifications/:id
 * Update notification
 */
export const updateNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, message, type, targetRecipient, targetCompanyIds, targetEmployeeIds, deliveryMethod, scheduledAt, status } = req.body;

  const notification = await AdminNotificationModel.findById(id);

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  // Cannot edit sent notifications
  if (notification.status === 'sent') {
    return sendResponse(res, 400, 'Cannot edit a notification that has already been sent', null);
  }

  // Update fields
  if (title) notification.title = title;
  if (message) notification.message = message;
  if (type) notification.type = type;
  if (targetRecipient) {
    notification.targetRecipient = targetRecipient;
    notification.targetCompanyIds = targetRecipient === 'specific_company' ? targetCompanyIds : undefined;
    notification.targetEmployeeIds = targetRecipient === 'specific_employee' ? targetEmployeeIds : undefined;
  }

  if (deliveryMethod) {
    notification.deliveryMethod = deliveryMethod;
    if (deliveryMethod === 'scheduled' && scheduledAt) {
      notification.scheduledAt = new Date(scheduledAt);
      notification.status = 'scheduled';
    } else if (deliveryMethod === 'now') {
      notification.status = 'draft';
    }
  }

  if (status && status !== notification.status) {
    notification.status = status;
  }

  await notification.save();

  // If status changed to 'sent', dispatch now
  if (status === 'sent' && deliveryMethod === 'now') {
    try {
      await dispatchAdminNotificationScalable(notification);
    } catch (error) {
      console.error('Error dispatching notification:', error);
      return sendResponse(res, 500, 'Notification updated but failed to dispatch', null);
    }
  }

  return sendResponse(res, 200, 'Notification updated successfully', notification);
});

/**
 * DELETE /admin/notifications/:id
 * Delete notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await AdminNotificationModel.findByIdAndDelete(id);

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  return sendResponse(res, 200, 'Notification deleted successfully', null);
});

/**
 * POST /admin/notifications/:id/schedule
 * Schedule a notification for later delivery
 */
export const scheduleNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    return sendResponse(res, 400, 'Scheduled date/time is required', null);
  }

  const notification = await AdminNotificationModel.findById(id);

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  if (notification.status === 'sent') {
    return sendResponse(res, 400, 'Cannot schedule a notification that has already been sent', null);
  }

  notification.deliveryMethod = 'scheduled';
  notification.scheduledAt = new Date(scheduledAt);
  notification.status = 'scheduled';
  await notification.save();

  return sendResponse(res, 200, 'Notification scheduled successfully', notification);
});

/**
 * POST /admin/notifications/:id/cancel
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await AdminNotificationModel.findById(id);

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  if (notification.status !== 'scheduled') {
    return sendResponse(res, 400, 'Only scheduled notifications can be cancelled', null);
  }

  notification.status = 'cancelled';
  notification.scheduledAt = undefined;
  await notification.save();

  return sendResponse(res, 200, 'Notification cancelled successfully', notification);
});
