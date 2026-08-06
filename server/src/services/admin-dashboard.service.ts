import * as AdminDashboardRepository from '../repositories/admin-dashboard.repository';

/**
 * Get admin dashboard overview statistics
 */
export const getOverviewStats = async () => {
  return AdminDashboardRepository.getAdminOverviewStats();
};

/**
 * Get admin dashboard chart data
 */
export const getChartData = async (month?: number, year?: number) => {
  return AdminDashboardRepository.getAdminChartData(month, year);
};

/**
 * Get admin notifications
 */
export const getNotifications = async (
  userId: string,
  filter: 'recent' | 'unread' | 'read' = 'recent',
  page: number = 1,
  limit: number = 10
) => {
  return AdminDashboardRepository.getAdminNotifications(userId, filter, page, limit);
};

/**
 * Get employee notifications
 */
export const getEmployeeNotifications = async (
  userId: string,
  filter: 'recent' | 'unread' | 'read' = 'recent',
  page: number = 1,
  limit: number = 10
) => {
  return AdminDashboardRepository.getUserNotifications(userId, filter, page, limit);
};

/**
 * Get company notifications (admin notifications sent to this company)
 */
export const getCompanyNotifications = async (
  userId: string,
  filter: 'recent' | 'unread' | 'read' = 'recent',
  page: number = 1,
  limit: number = 10
) => {
  return AdminDashboardRepository.getUserNotifications(userId, filter, page, limit);
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  return AdminDashboardRepository.markNotificationAsRead(notificationId);
};

/**
 * Mark notification as unread
 */
export const markNotificationAsUnread = async (notificationId: string) => {
  return AdminDashboardRepository.markNotificationAsUnread(notificationId);
};

/**
 * Mark employee notification as read
 */
export const markEmployeeNotificationAsRead = async (notificationId: string) => {
  return AdminDashboardRepository.markUserNotificationAsRead(notificationId);
};

/**
 * Mark employee notification as unread
 */
export const markEmployeeNotificationAsUnread = async (notificationId: string) => {
  return AdminDashboardRepository.markUserNotificationAsUnread(notificationId);
};

/**
 * Mark company notification as read
 */
export const markCompanyNotificationAsRead = async (notificationId: string) => {
  return AdminDashboardRepository.markUserNotificationAsRead(notificationId);
};

/**
 * Mark company notification as unread
 */
export const markCompanyNotificationAsUnread = async (notificationId: string) => {
  return AdminDashboardRepository.markUserNotificationAsUnread(notificationId);
};

/**
 * Get recent activities
 */
export const getRecentActivities = async (page: number = 1, limit: number = 10) => {
  return AdminDashboardRepository.getAdminRecentActivities(page, limit);
};

/**
 * Create a notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info' | 'error' = 'info',
  relatedTo?: string,
  relatedId?: string
) => {
  return AdminDashboardRepository.createNotification(userId, title, message, type, relatedTo, relatedId);
};

/**
 * Create an activity
 */
export const createActivity = async (
  userId: string,
  user: string,
  activity: string,
  type: string,
  details?: Record<string, any>
) => {
  return AdminDashboardRepository.createActivity(userId, user, activity, type, details);
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId: string) => {
  return AdminDashboardRepository.getUnreadNotificationCount(userId);
};

/**
 * Get unread employee notification count
 */
export const getEmployeeUnreadNotificationCount = async (userId: string) => {
  return AdminDashboardRepository.getUserUnreadNotificationCount(userId);
};
