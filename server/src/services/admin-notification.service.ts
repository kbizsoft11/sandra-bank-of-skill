import { AdminNotificationModel, IAdminNotification } from '../models/admin-notification.model';
import { NotificationModel } from '../models/notification.model';
import { UserModel } from '../models/user.model';

/**
 * Dispatch notifications based on target recipient type
 */
export const dispatchAdminNotification = async (notification: IAdminNotification): Promise<{ companiesCount: number; employeesCount: number }> => {
  let targetUsers: any[] = [];
  let companiesCount = 0;
  let employeesCount = 0;

  try {
    // Build filter based on target recipient type
    let userFilter: any = {};

    if (notification.targetRecipient === 'all_companies') {
      // Send to all company users
      userFilter.role = 'company';
    } else if (notification.targetRecipient === 'all_employees') {
      // Send to all employee users
      userFilter.role = 'employee';
    } else if (notification.targetRecipient === 'all_users') {
      // Send to all users (both company and employee)
      userFilter.role = { $in: ['company', 'employee'] };
    } else if (notification.targetRecipient === 'specific_company' && notification.targetCompanyIds?.length) {
      // Send to specific companies
      userFilter._id = { $in: notification.targetCompanyIds };
      userFilter.role = 'company';
    } else if (notification.targetRecipient === 'specific_employee' && notification.targetEmployeeIds?.length) {
      // Send to specific employees
      userFilter._id = { $in: notification.targetEmployeeIds };
      userFilter.role = 'employee';
    }

    // Find target users
    targetUsers = await UserModel.find(userFilter).select('_id role').lean();

    if (targetUsers.length > 0) {
      // Separate companies and employees for counting
      companiesCount = targetUsers.filter((u) => u.role === 'company').length;
      employeesCount = targetUsers.filter((u) => u.role === 'employee').length;

      // Map notification type to system notification type
      const mapTypeToSystemType = (type: string): 'info' | 'warning' | 'error' | 'success' => {
        switch (type) {
          case 'warning':
            return 'warning';
          case 'alert':
            return 'error';
          case 'announcement':
            return 'success';
          default:
            return 'info';
        }
      };

      // Create notification records for each recipient
      const notificationDocs = targetUsers.map((user) => ({
        userId: user._id.toString(),
        title: notification.title,
        message: notification.message,
        type: mapTypeToSystemType(notification.type),
        isRead: false,
        relatedTo: 'admin_notification',
        relatedId: notification._id.toString(),
      }));

      await NotificationModel.insertMany(notificationDocs);

      console.log(`✅ Admin notification dispatched to ${targetUsers.length} users (${companiesCount} companies, ${employeesCount} employees)`);
    }

    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.recipientCount = targetUsers.length;
    notification.companiesNotifiedCount = companiesCount;
    notification.employeesNotifiedCount = employeesCount;
    await notification.save();

    return { companiesCount, employeesCount };
  } catch (error) {
    console.error('Error dispatching admin notification:', error);
    throw error;
  }
};

/**
 * Process due scheduled admin notifications
 */
export const processDueScheduledAdminNotifications = async () => {
  try {
    const dueNotifications = await AdminNotificationModel.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });

    for (const notification of dueNotifications) {
      try {
        console.log(`⏰ Processing scheduled admin notification: ${notification._id}`);
        await dispatchAdminNotification(notification);
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
    console.error('Error processing due scheduled admin notifications:', error);
  }
};

/**
 * Get statistics for admin notification
 */
export const getNotificationStats = async (notificationId: string) => {
  const notification = await AdminNotificationModel.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  return {
    totalRecipients: notification.recipientCount,
    companiesNotified: notification.companiesNotifiedCount || 0,
    employeesNotified: notification.employeesNotifiedCount || 0,
    status: notification.status,
    sentAt: notification.sentAt,
  };
};
