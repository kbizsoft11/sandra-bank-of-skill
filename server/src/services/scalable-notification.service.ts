import { AdminNotificationModel, IAdminNotification } from '../models/admin-notification.model';
import { NotificationReadReceiptModel, INotificationReadReceipt } from '../models/notification-read-receipt.model';
import { CompanyNotificationModel } from '../models/company-notification.model';
import { UserModel } from '../models/user.model';

type NotificationReceiptType = 'info' | 'warning' | 'error' | 'success' | 'announcement' | 'alert';

const getNotificationDetails = async (notificationId: string) => {
  const projection = '_id title message type';
  const adminNotification = await AdminNotificationModel.findById(notificationId)
    .select(projection)
    .lean();

  if (adminNotification) {
    return {
      title: adminNotification.title,
      message: adminNotification.message,
      type: adminNotification.type,
      source: 'admin' as const,
    };
  }

  const companyNotification = await CompanyNotificationModel.findById(notificationId)
    .select(projection)
    .lean();

  if (companyNotification) {
    return {
      title: companyNotification.title,
      message: companyNotification.message,
      // Read receipts do not support the company-only `assessment` type.
      type: (companyNotification.type === 'assessment' ? 'info' : companyNotification.type) as NotificationReceiptType,
      source: 'company' as const,
    };
  }

  throw new Error(`Notification ${notificationId} not found`);
};

/**
 * Dispatch admin notification to all target users using bulk insert
 * Handles 100k+ users efficiently
 */
export const dispatchAdminNotificationScalable = async (
  notification: IAdminNotification
): Promise<{ companiesCount: number; employeesCount: number; totalCount: number }> => {
  let targetUsers: any[] = [];
  let companiesCount = 0;
  let employeesCount = 0;

  try {
    // Build filter based on target recipient type
    let userFilter: any = {};

    if (notification.targetRecipient === 'all_companies') {
      userFilter.role = 'company';
    } else if (notification.targetRecipient === 'all_employees') {
      userFilter.role = 'employee';
    } else if (notification.targetRecipient === 'all_users') {
      userFilter.role = { $in: ['company', 'employee'] };
    } else if (notification.targetRecipient === 'specific_company' && notification.targetCompanyIds?.length) {
      userFilter._id = { $in: notification.targetCompanyIds };
      userFilter.role = 'company';
    } else if (notification.targetRecipient === 'specific_employee' && notification.targetEmployeeIds?.length) {
      userFilter._id = { $in: notification.targetEmployeeIds };
      userFilter.role = 'employee';
    }

    // Find target users - optimized query
    targetUsers = await UserModel.find(userFilter).select('_id role').lean();

    if (targetUsers.length > 0) {
      // Separate companies and employees for counting
      companiesCount = targetUsers.filter((u) => u.role === 'company').length;
      employeesCount = targetUsers.filter((u) => u.role === 'employee').length;

      console.log(`📤 Starting dispatch of notification to ${targetUsers.length} users...`);

      // Process in batches to avoid memory issues with 100k+ users
      const BATCH_SIZE = 1000;
      let processed = 0;

      for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
        const batch = targetUsers.slice(i, i + BATCH_SIZE);

        // Create read receipt documents for this batch
        const readReceiptDocs = batch.map((user) => ({
          notificationId: notification._id.toString(),
          userId: user._id.toString(),
          isRead: false,
          readAt: null,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          source: 'admin',
        }));

        // Bulk insert with ordered: false for better performance
        await NotificationReadReceiptModel.insertMany(readReceiptDocs, { ordered: false }).catch((err) => {
          // Ignore duplicate key errors if they occur
          if (err.code !== 11000) {
            throw err;
          }
        });

        processed += batch.length;
        const percentage = Math.round((processed / targetUsers.length) * 100);
        console.log(`✅ Processed ${processed}/${targetUsers.length} (${percentage}%) read receipts`);
      }

      console.log(`✅ All read receipts created for notification ${notification._id}`);
    }

    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.recipientCount = targetUsers.length;
    notification.companiesNotifiedCount = companiesCount;
    notification.employeesNotifiedCount = employeesCount;
    await notification.save();

    console.log(
      `✅ Admin notification dispatched successfully to ${targetUsers.length} users (${companiesCount} companies, ${employeesCount} employees)`
    );

    return { companiesCount, employeesCount, totalCount: targetUsers.length };
  } catch (error) {
    console.error('❌ Error dispatching admin notification:', error);
    throw error;
  }
};

/**
 * Get user's notifications with read status
 * Uses efficient queries with pagination
 */
export const getUserNotificationsScalable = async (
  userId: string,
  filter: 'recent' | 'unread' | 'read' = 'recent',
  page: number = 1,
  limit: number = 10
): Promise<{
  notifications: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  try {
    const skip = (page - 1) * limit;

    // Build query for read receipts
    let query: any = { userId };

    if (filter === 'unread') {
      query.isRead = false;
    } else if (filter === 'read') {
      query.isRead = true;
    }

    // Get total count
    const total = await NotificationReadReceiptModel.countDocuments(query);

    // Get paginated read receipts with notification details
    const readReceipts = await NotificationReadReceiptModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Use denormalized data from read receipts (title, message stored directly)
    // For any missing data, try to lookup from original notification
    const readReceiptIds = readReceipts.map(r => r.notificationId);
    
    // Fetch all original notifications that might be needed for fallback
    let adminNotifications: any[] = [];
    let companyNotifications: any[] = [];
    
    if (readReceiptIds.length > 0) {
      try {
        adminNotifications = await AdminNotificationModel.find({ _id: { $in: readReceiptIds } })
          .select('_id title message type')
          .lean()
          .catch(() => []);
      } catch (err) {
        console.error('Error fetching admin notifications for fallback:', err);
      }
      
      try {
        const { CompanyNotificationModel } = await import('../models/company-notification.model');
        companyNotifications = await CompanyNotificationModel.find({ _id: { $in: readReceiptIds } })
          .select('_id title message type')
          .lean()
          .catch(() => []);
      } catch (err) {
        console.error('Error fetching company notifications for fallback:', err);
      }
    }
    
    // Create lookup maps
    const adminLookup = new Map(adminNotifications.map(n => [n._id.toString(), n]));
    const companyLookup = new Map(companyNotifications.map(n => [n._id.toString(), n]));

    const merged = readReceipts.map((receipt) => {
      // If read receipt already has title and message (new system), use it
      if (receipt.title && receipt.message) {
        return {
          _id: receipt._id,
          notificationId: receipt.notificationId,
          title: receipt.title,
          message: receipt.message,
          type: receipt.type || 'info',
          isRead: receipt.isRead,
          readAt: receipt.readAt,
          createdAt: receipt.createdAt,
          source: receipt.source || 'admin',
        };
      }
      
      // Fallback for old read receipts without denormalized data - lookup from original
      const notifId = receipt.notificationId?.toString();
      const adminNotif = adminLookup.get(notifId);
      const companyNotif = companyLookup.get(notifId);
      const originalNotif = adminNotif || companyNotif;
      
      return {
        _id: receipt._id,
        notificationId: receipt.notificationId,
        title: originalNotif?.title || 'Unknown',
        message: originalNotif?.message || '',
        type: originalNotif?.type || receipt.type || 'info',
        isRead: receipt.isRead,
        readAt: receipt.readAt,
        createdAt: receipt.createdAt,
        source: receipt.source || 'admin',
      };
    });

    return {
      notifications: merged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('❌ Error fetching user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read for a user
 * Optimized with bulk update
 */
export const markNotificationAsReadScalable = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    console.log(`🔍 Marking notification as read - notificationId: ${notificationId}, userId: ${userId}`);
    
    // Try to find existing read receipt
    let receipt = await NotificationReadReceiptModel.findOne({ notificationId, userId });

    // Older clients used the read-receipt _id in this endpoint.
    if (!receipt) {
      receipt = await NotificationReadReceiptModel.findOne({ _id: notificationId, userId });
    }

    if (!receipt) {
      console.log(`⚠️ No read receipt found, creating one...`);
      const notificationDetails = await getNotificationDetails(notificationId);

      receipt = await NotificationReadReceiptModel.create({
        notificationId,
        userId,
        isRead: true,
        readAt: new Date(),
        ...notificationDetails,
      });
      console.log(`✅ Created read receipt:`, receipt);
    } else {
      console.log(`✅ Found existing read receipt, updating...`);
      if (!receipt.title || !receipt.message) {
        Object.assign(receipt, await getNotificationDetails(notificationId));
      }

      // Update existing read receipt
      receipt.isRead = true;
      receipt.readAt = new Date();
      await receipt.save();
      console.log(`✅ Updated read receipt:`, receipt);
    }
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark notification as unread for a user
 */
export const markNotificationAsUnreadScalable = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    // Try to find existing read receipt
    let receipt = await NotificationReadReceiptModel.findOne({ notificationId, userId });

    // Older clients used the read-receipt _id in this endpoint.
    if (!receipt) {
      receipt = await NotificationReadReceiptModel.findOne({ _id: notificationId, userId });
    }

    if (!receipt) {
      const notificationDetails = await getNotificationDetails(notificationId);

      receipt = await NotificationReadReceiptModel.create({
        notificationId,
        userId,
        isRead: false,
        readAt: undefined,
        ...notificationDetails,
      });
      console.log(`✅ Created read receipt for notification ${notificationId} for user ${userId}`);
    } else {
      if (!receipt.title || !receipt.message) {
        Object.assign(receipt, await getNotificationDetails(notificationId));
      }

      // Update existing read receipt
      receipt.isRead = false;
      receipt.readAt = undefined;
      await receipt.save();
      console.log(`✅ Marked notification ${notificationId} as unread for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error marking notification as unread:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * Very fast query using index
 */
export const getUnreadNotificationCountScalable = async (userId: string): Promise<number> => {
  try {
    const count = await NotificationReadReceiptModel.countDocuments({
      userId,
      isRead: false,
    });

    return count;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
};

/**
 * Get notification analytics
 * How many users read a specific notification
 */
export const getNotificationAnalyticsScalable = async (notificationId: string) => {
  try {
    const [readCount, unreadCount, totalCount] = await Promise.all([
      NotificationReadReceiptModel.countDocuments({ notificationId, isRead: true }),
      NotificationReadReceiptModel.countDocuments({ notificationId, isRead: false }),
      NotificationReadReceiptModel.countDocuments({ notificationId }),
    ]);

    return {
      notificationId,
      totalRecipients: totalCount,
      readCount,
      unreadCount,
      readPercentage: totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
    };
  } catch (error) {
    console.error('❌ Error getting notification analytics:', error);
    throw error;
  }
};

/**
 * Delete old read receipts (archive old notifications)
 * Run as a cron job periodically
 */
export const cleanupOldReadReceipts = async (daysToKeep: number = 90): Promise<{ deletedCount: number }> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await NotificationReadReceiptModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(`🗑️ Deleted ${result.deletedCount} old read receipts older than ${daysToKeep} days`);

    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error('❌ Error cleaning up old read receipts:', error);
    throw error;
  }
};

/**
 * Process due scheduled admin notifications
 */
export const processDueScheduledAdminNotificationsScalable = async () => {
  try {
    const dueNotifications = await AdminNotificationModel.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });

    for (const notification of dueNotifications) {
      try {
        console.log(`⏰ Processing scheduled admin notification: ${notification._id}`);
        await dispatchAdminNotificationScalable(notification);
      } catch (err) {
        console.error(`❌ Failed to dispatch scheduled admin notification ${notification._id}:`, err);
        // Mark as failed but continue processing others
        notification.status = 'draft';
        await notification.save();
      }
    }

    if (dueNotifications.length > 0) {
      console.log(`✅ Processed ${dueNotifications.length} due scheduled admin notifications`);
    }
  } catch (error) {
    console.error('❌ Error processing due scheduled admin notifications:', error);
  }
};


/**
 * Dispatch company notification to target employees using scalable system
 * Handles efficient bulk operations for company-specific notifications
 */
export const dispatchCompanyNotificationScalable = async (
  notification: {
    _id: string;
    title: string;
    message: string;
    type: string;
    targetAudience: string;
    targetEmployeeIds?: string[];
  },
  organisationId: string,
  tenantId: string
): Promise<{ employeesCount: number; totalCount: number }> => {
  let targetEmployees: any[] = [];
  let employeesCount = 0;

  try {
    console.log(`\n🚀 DISPATCH COMPANY NOTIFICATION START`);
    console.log(`📋 Notification: ${notification.title}`);
    console.log(`🏢 organisationId: ${organisationId}, tenantId: ${tenantId}`);
    console.log(`📍 targetAudience: ${notification.targetAudience}`);
    console.log(`👥 targetEmployeeIds: ${notification.targetEmployeeIds?.join(', ') || 'none'}`);

    // Build filter based on target audience type
    let userFilter: any = {
      role: 'employee',
      organisationId,
      tenantId,
    };

    if (notification.targetAudience === 'all') {
      // All employees in the company - filter is already set
      console.log(`✅ Filtering: All employees in organisation ${organisationId}`);
    } else if (notification.targetAudience === 'specific' && notification.targetEmployeeIds?.length) {
      // Specific employees
      userFilter._id = { $in: notification.targetEmployeeIds };
      console.log(`✅ Filtering: Specific ${notification.targetEmployeeIds.length} employees`);
    } else {
      // Default to all employees if audience type is invalid
      console.log(`✅ Filtering: Default to all employees (invalid audience type)`);
    }

    // Find target employees - optimized query
    console.log(`🔍 Querying employees with filter:`, JSON.stringify(userFilter));
    targetEmployees = await UserModel.find(userFilter).select('_id role organisationId tenantId').lean();
    console.log(`✅ Found ${targetEmployees.length} target employees`);

    if (targetEmployees.length > 0) {
      employeesCount = targetEmployees.length;

      console.log(
        `📤 Starting dispatch of company notification to ${targetEmployees.length} employees...`
      );

      // Process in batches to avoid memory issues
      const BATCH_SIZE = 1000;
      let processed = 0;

      for (let i = 0; i < targetEmployees.length; i += BATCH_SIZE) {
        const batch = targetEmployees.slice(i, i + BATCH_SIZE);

        // Create read receipt documents for this batch
        const readReceiptDocs = batch.map((employee) => ({
          notificationId: notification._id.toString(),
          userId: employee._id.toString(),
          isRead: false,
          readAt: null,
          type: notification.type === 'assessment' ? 'info' : notification.type,
          title: notification.title,
          message: notification.message,
          source: 'company',
        }));

        console.log(`📝 Creating ${readReceiptDocs.length} read receipts for batch ${i / BATCH_SIZE + 1}`);

        // Bulk insert with ordered: false for better performance
        await NotificationReadReceiptModel.insertMany(readReceiptDocs, { ordered: false }).catch(
          (err) => {
            // Ignore duplicate key errors if they occur
            if (err.code !== 11000) {
              console.error(`❌ Error inserting read receipts:`, err.message);
              throw err;
            } else {
              console.log(`⚠️ Duplicate key error (ignored) - some read receipts already exist`);
            }
          }
        );

        processed += batch.length;
        const percentage = Math.round((processed / targetEmployees.length) * 100);
        console.log(
          `✅ Processed ${processed}/${targetEmployees.length} (${percentage}%) read receipts for company notification`
        );
      }

      console.log(`✅ All read receipts created for company notification ${notification._id}`);
    } else {
      console.log(`⚠️ No target employees found! Check organisationId/tenantId match`);
    }

    console.log(`✅ Company notification dispatched successfully to ${targetEmployees.length} employees\n`);

    return { employeesCount, totalCount: targetEmployees.length };
  } catch (error) {
    console.error('❌ Error dispatching company notification:', error);
    throw error;
  }
};

/**
 * Process due scheduled company notifications
 * Should be called periodically by a cron job
 */
export const processCompanyScheduledNotificationsScalable = async (
  organisationId: string,
  tenantId: string
): Promise<number> => {
  try {
    const { CompanyNotificationModel } = await import('../models/company-notification.model');

    const dueNotifications = await CompanyNotificationModel.find({
      organisationId,
      tenantId,
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });

    console.log(`📋 Found ${dueNotifications.length} due company notifications to process`);

    for (const notification of dueNotifications) {
      try {
        const targetEmployeeIds = (notification as any).targetEmployeeIds || [];
        
        await dispatchCompanyNotificationScalable(
          {
            _id: notification._id.toString(),
            title: notification.title,
            message: notification.message,
            type: notification.type,
            targetAudience: (notification as any).targetAudience,
            targetEmployeeIds,
          },
          organisationId,
          tenantId
        );

        // Mark as sent
        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();

        console.log(`✅ Processed scheduled company notification: ${notification._id}`);
      } catch (err) {
        console.error(`❌ Failed to process scheduled company notification ${notification._id}:`, err);
      }
    }

    return dueNotifications.length;
  } catch (error) {
    console.error('❌ Error processing company scheduled notifications:', error);
    return 0;
  }
};
