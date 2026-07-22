import { UserModel } from '../models/user.model';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skillCategory.model';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { NotificationModel } from '../models/notification.model';
import { ActivityModel } from '../models/activity.model';

/**
 * Get admin dashboard overview statistics
 */
export const getAdminOverviewStats = async () => {
  const totalCompanies = await UserModel.countDocuments({ role: 'company' });
  const totalEmployees = await UserModel.countDocuments({ role: 'employee' });
  const totalSkills = await Skill.countDocuments();
  const totalCategories = await SkillCategory.countDocuments();
  const totalQuestionnaires = await QuestionnaireModel.countDocuments();

  // Get active users count (logged in within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeUsers = await UserModel.countDocuments({
    lastLoginAt: { $gte: thirtyDaysAgo },
  });

  // Get today's new companies
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNewCompanies = await UserModel.countDocuments({
    role: 'company',
    createdAt: { $gte: today },
  });

  // Get today's new employees
  const todayNewEmployees = await UserModel.countDocuments({
    role: 'employee',
    createdAt: { $gte: today },
  });

  // Calculate growth percentages
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const companiesLastMonth = await UserModel.countDocuments({
    role: 'company',
    createdAt: { $gte: lastMonth, $lt: today },
  });

  const employeesLastMonth = await UserModel.countDocuments({
    role: 'employee',
    createdAt: { $gte: lastMonth, $lt: today },
  });

  const companiesGrowthPercentage = companiesLastMonth > 0
    ? Math.round(((totalCompanies - companiesLastMonth) / companiesLastMonth) * 100)
    : 0;

  const employeesGrowthPercentage = employeesLastMonth > 0
    ? Math.round(((totalEmployees - employeesLastMonth) / employeesLastMonth) * 100)
    : 0;

  return {
    totalCompanies,
    totalEmployees,
    totalSkills,
    totalCategories,
    totalQuestionnaires,
    activeUsers,
    todayNewCompanies,
    todayNewEmployees,
    companiesGrowthPercentage,
    employeesGrowthPercentage,
  };
};

/**
 * Get admin dashboard chart data
 */
export const getAdminChartData = async (month?: number, year?: number) => {
  // Companies growth (monthly data)
  const companiesGrowth = await UserModel.aggregate([
    {
      $match: { role: 'company' },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
    {
      $limit: 12,
    },
  ]);

  // Employees growth (monthly data)
  const employeesGrowth = await UserModel.aggregate([
    {
      $match: { role: 'employee' },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
    {
      $limit: 12,
    },
  ]);

  // Skills distribution by category
  const skillsDistribution = await Skill.aggregate([
    {
      $lookup: {
        from: 'skillcategories',
        localField: 'cat_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$category.cat_name',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  // Top 10 skills
  const topSkills = await Skill.aggregate([
    {
      $group: {
        _id: '$skill_name',
        employeeCount: { $sum: 1 },
      },
    },
    {
      $sort: { employeeCount: -1 },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        skillName: '$_id',
        employeeCount: 1,
        _id: 0,
      },
    },
  ]);

  // Questionnaire completion (if questionnaire responses exist)
  // Using placeholder data
  const questionnaireCompletion = {
    completed: 0,
    pending: 0,
    notStarted: 0,
  };

  // User roles distribution
  const userRoles = await UserModel.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    companiesGrowth,
    employeesGrowth,
    skillsDistribution,
    topSkills,
    questionnaireCompletion,
    userRoles,
  };
};

/**
 * Get paginated notifications
 */
export const getAdminNotifications = async (
  userId: string,
  filter: 'recent' | 'unread' | 'read' = 'recent',
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
  let query: any = { userId };

  if (filter === 'unread') {
    query.isRead = false;
  } else if (filter === 'read') {
    query.isRead = true;
  }

  const notifications = await NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await NotificationModel.countDocuments(query);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  return NotificationModel.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
};

/**
 * Mark notification as unread
 */
export const markNotificationAsUnread = async (notificationId: string) => {
  return NotificationModel.findByIdAndUpdate(
    notificationId,
    { isRead: false },
    { new: true }
  );
};

/**
 * Get paginated recent activities
 */
export const getAdminRecentActivities = async (
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const activities = await ActivityModel.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await ActivityModel.countDocuments({});

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
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
  const notification = new NotificationModel({
    userId,
    title,
    message,
    type,
    relatedTo,
    relatedId,
  });

  return notification.save();
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
  const activityPayload: Record<string, any> = {
    userId,
    user,
    activity,
    type,
    details,
  };

  if (details?.tenantId) {
    activityPayload.tenantId = details.tenantId;
  }

  if (details?.organisationId) {
    activityPayload.organisationId = details.organisationId;
  }

  const activityRecord = new ActivityModel(activityPayload);

  return activityRecord.save();
};

/**
 * Get unread notification count for admin
 */
export const getUnreadNotificationCount = async (userId: string) => {
  return NotificationModel.countDocuments({ userId, isRead: false });
};
