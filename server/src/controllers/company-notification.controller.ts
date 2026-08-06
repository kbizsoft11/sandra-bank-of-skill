import { Request, Response } from 'express';
import { CompanyNotificationModel } from '../models/company-notification.model';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { dispatchCompanyNotificationScalable, processCompanyScheduledNotificationsScalable } from '../services/scalable-notification.service';

/**
 * GET /company-notifications
 * Get all company notifications (paginated)
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, type, search, page = 1, limit = 10 } = req.query;

  // Process any due scheduled notifications using scalable method
  await processCompanyScheduledNotificationsScalable(user.organisationId, user.tenantId).catch(() => {});

  const query: any = {
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  };

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
    CompanyNotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    CompanyNotificationModel.countDocuments(query),
  ]);

  return sendResponse(res, 200, 'Notifications retrieved successfully', notifications);
});

/**
 * GET /company-notifications/:id
 * Get single notification by ID
 */
export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const notification = await CompanyNotificationModel.findOne({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  }).lean();

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  return sendResponse(res, 200, 'Notification retrieved successfully', notification);
});

/**
 * POST /company-notifications
 * Create a new notification (Send now or Schedule)
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, message, type, targetAudience, targetEmployeeIds, deliveryMethod, scheduledAt } = req.body;

  // Validate required fields
  if (!title || !message) {
    return sendResponse(res, 400, 'Title and message are required', null);
  }

  if (!targetAudience) {
    return sendResponse(res, 400, 'Target audience is required', null);
  }

  // Validate specific employee IDs if provided
  if (targetAudience === 'specific' && (!targetEmployeeIds || targetEmployeeIds.length === 0)) {
    return sendResponse(res, 400, 'Please select at least one employee', null);
  }

  const isScheduled = deliveryMethod === 'scheduled' && scheduledAt;
  const initialStatus = isScheduled ? 'scheduled' : 'draft';

  const notification = await CompanyNotificationModel.create({
    title,
    message,
    type: type || 'info',
    targetAudience,
    targetEmployeeIds: targetAudience === 'specific' ? targetEmployeeIds : [],
    deliveryMethod: deliveryMethod || 'now',
    scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
    status: initialStatus,
    createdBy: user.userId,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

  // If delivery is immediate, dispatch now using scalable service
  if (deliveryMethod === 'now') {
    try {
      const dispatchResult = await dispatchCompanyNotificationScalable(
        {
          _id: notification._id.toString(),
          title,
          message,
          type: type || 'info',
          targetAudience,
          targetEmployeeIds: targetAudience === 'specific' ? targetEmployeeIds : [],
        },
        user.organisationId,
        user.tenantId
      );

      // Update notification with dispatch results
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.recipientCount = dispatchResult.totalCount;
      await notification.save();

      console.log(`✅ Notification dispatched and saved - sent to ${dispatchResult.totalCount} employees`);
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
 * PUT /company-notifications/:id
 * Update notification
 */
export const updateNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { title, message, type, targetAudience, targetEmployeeIds, deliveryMethod, scheduledAt, status } = req.body;

  const notification = await CompanyNotificationModel.findOne({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

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
  if (targetAudience) {
    notification.targetAudience = targetAudience;
    notification.targetEmployeeIds = targetAudience === 'specific' ? targetEmployeeIds : [];
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
      const dispatchResult = await dispatchCompanyNotificationScalable(
        {
          _id: notification._id.toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          targetAudience: notification.targetAudience,
          targetEmployeeIds: notification.targetEmployeeIds || [],
        },
        user.organisationId,
        user.tenantId
      );

      // Update with dispatch results
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.recipientCount = dispatchResult.totalCount;
      await notification.save();

      console.log(`✅ Notification sent and updated - sent to ${dispatchResult.totalCount} employees`);
    } catch (error) {
      console.error('Error dispatching notification:', error);
      return sendResponse(res, 500, 'Notification updated but failed to dispatch', null);
    }
  }

  return sendResponse(res, 200, 'Notification updated successfully', notification);
});

/**
 * DELETE /company-notifications/:id
 * Delete notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const notification = await CompanyNotificationModel.findOneAndDelete({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  return sendResponse(res, 200, 'Notification deleted successfully', null);
});

/**
 * POST /company-notifications/:id/schedule
 * Schedule a notification for later delivery
 */
export const scheduleNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    return sendResponse(res, 400, 'Scheduled date/time is required', null);
  }

  const notification = await CompanyNotificationModel.findOne({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

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
 * POST /company-notifications/:id/cancel
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const notification = await CompanyNotificationModel.findOne({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

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

