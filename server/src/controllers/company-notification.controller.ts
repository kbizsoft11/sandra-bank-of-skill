import { Request, Response } from 'express';
import { CompanyNotificationModel, ICompanyNotification } from '../models/company-notification.model';
import { NotificationModel } from '../models/notification.model';
import { UserModel } from '../models/user.model';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

/**
 * Helper to dispatch in-app notifications to targeted employees
 */
const dispatchNotificationToEmployees = async (notification: ICompanyNotification): Promise<number> => {
  const filter: any = {
    tenantId: notification.tenantId,
    organisationId: notification.organisationId,
    role: 'employee',
  };

  if (notification.targetAudience === 'role' && notification.targetDesignationId) {
    filter.designationId = notification.targetDesignationId;
  } else if (notification.targetAudience === 'department' && notification.targetDepartment) {
    filter.department = notification.targetDepartment;
  }

  const targetEmployees = await UserModel.find(filter).select('_id');

  if (targetEmployees.length > 0) {
    const mapTypeToSystemType = (type: string): 'info' | 'warning' | 'error' | 'success' => {
      switch (type) {
        case 'warning':
          return 'warning';
        case 'assessment':
          return 'info';
        case 'announcement':
          return 'success';
        default:
          return 'info';
      }
    };

    const notificationDocs = targetEmployees.map((emp) => ({
      userId: emp._id.toString(),
      title: notification.title,
      message: notification.message,
      type: mapTypeToSystemType(notification.type),
      isRead: false,
      relatedTo: 'company_notification',
      relatedId: notification._id.toString(),
    }));

    await NotificationModel.insertMany(notificationDocs);
  }

  notification.status = 'sent';
  notification.sentAt = new Date();
  notification.recipientCount = targetEmployees.length;
  await notification.save();

  return targetEmployees.length;
};

/**
 * Check and auto-dispatch any due scheduled notifications
 */
const processDueScheduledNotifications = async (tenantId: string, organisationId: string) => {
  const dueNotifications = await CompanyNotificationModel.find({
    tenantId,
    organisationId,
    status: 'scheduled',
    scheduledAt: { $lte: new Date() },
  });

  for (const notification of dueNotifications) {
    try {
      await dispatchNotificationToEmployees(notification);
    } catch (err) {
      console.error(`Failed to dispatch scheduled notification ${notification._id}:`, err);
    }
  }
};

/**
 * Get all company notifications
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Process any due scheduled notifications for this company
  if (user.tenantId && user.organisationId) {
    await processDueScheduledNotifications(user.tenantId, user.organisationId).catch(() => {});
  }

  const { status, type, search } = req.query;

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

  const notifications = await CompanyNotificationModel.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return sendResponse(res, 200, 'Company notifications fetched successfully', notifications);
});

/**
 * Get notification details by ID
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

  return sendResponse(res, 200, 'Notification fetched successfully', notification);
});

/**
 * Create a new notification (Send now or Schedule)
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    title,
    message,
    type,
    targetAudience,
    targetDesignationId,
    targetDepartment,
    deliveryMethod,
    scheduledAt,
  } = req.body;

  if (!title || !message) {
    return sendResponse(res, 400, 'Title and message are required', null);
  }

  const isScheduled = deliveryMethod === 'scheduled' && scheduledAt;
  const initialStatus = isScheduled ? 'scheduled' : 'draft';

  const notification = await CompanyNotificationModel.create({
    title,
    message,
    type: type || 'info',
    targetAudience: targetAudience || 'all',
    targetDesignationId: targetDesignationId || undefined,
    targetDepartment: targetDepartment || undefined,
    deliveryMethod: deliveryMethod || 'now',
    scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
    status: initialStatus,
    createdBy: user.userId,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

  if (deliveryMethod === 'now') {
    await dispatchNotificationToEmployees(notification);
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
 * Update notification
 */
export const updateNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const {
    title,
    message,
    type,
    targetAudience,
    targetDesignationId,
    targetDepartment,
    deliveryMethod,
    scheduledAt,
    status,
  } = req.body;

  const notification = await CompanyNotificationModel.findOne({
    _id: id,
    tenantId: user.tenantId,
    organisationId: user.organisationId,
  });

  if (!notification) {
    return sendResponse(res, 404, 'Notification not found', null);
  }

  if (notification.status === 'sent') {
    return sendResponse(res, 400, 'Cannot edit a notification that has already been sent', null);
  }

  if (title) notification.title = title;
  if (message) notification.message = message;
  if (type) notification.type = type;
  if (targetAudience) notification.targetAudience = targetAudience;
  if (targetDesignationId !== undefined) notification.targetDesignationId = targetDesignationId || undefined;
  if (targetDepartment !== undefined) notification.targetDepartment = targetDepartment || undefined;

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

  if (deliveryMethod === 'now' && status === 'sent') {
    await dispatchNotificationToEmployees(notification);
  }

  return sendResponse(res, 200, 'Notification updated successfully', notification);
});

/**
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
 * Schedule or Reschedule notification
 */
export const scheduleNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    return sendResponse(res, 400, 'Scheduled date and time is required', null);
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

  const scheduleDate = new Date(scheduledAt);

  // If scheduled for right now or past, dispatch immediately
  if (scheduleDate.getTime() <= Date.now() + 60000) {
    notification.deliveryMethod = 'now';
    await dispatchNotificationToEmployees(notification);
    return sendResponse(res, 200, 'Notification sent immediately', notification);
  }

  notification.deliveryMethod = 'scheduled';
  notification.scheduledAt = scheduleDate;
  notification.status = 'scheduled';
  await notification.save();

  return sendResponse(res, 200, 'Notification scheduled successfully', notification);
});

/**
 * Cancel scheduled notification
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
  await notification.save();

  return sendResponse(res, 200, 'Scheduled notification cancelled', notification);
});
