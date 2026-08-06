import { ActivityModel } from '../models/activity.model';
import { Schema, Types } from 'mongoose';

interface CreateActivityDto {
  userId: string | Schema.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'company' | 'employee';
  actionType: string;
  resource: string;
  resourceId?: string | Schema.Types.ObjectId;
  resourceName?: string;
  description: string;
  status?: 'success' | 'failure' | 'pending';
  companyId?: string | Schema.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { old: any; new: any }>;
  details?: Record<string, any>;
  errorMessage?: string;
}

interface GetActivitiesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  actionType?: string;
  resource?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  companyId?: string;
  userRole?: string;
}

export class ActivityRepository {
  /**
   * Create a new activity log
   */
  async create(data: CreateActivityDto) {
    // Convert string IDs to ObjectIds
    const activityData: any = {
      ...data,
      userId: typeof data.userId === 'string' ? new Types.ObjectId(data.userId) : data.userId,
    };

    if (data.resourceId) {
      activityData.resourceId = typeof data.resourceId === 'string' ? new Types.ObjectId(data.resourceId) : data.resourceId;
    }

    if (data.companyId) {
      activityData.companyId = typeof data.companyId === 'string' ? new Types.ObjectId(data.companyId) : data.companyId;
    }

    const activity = new ActivityModel(activityData);
    return activity.save();
  }

  /**
   * Get all activities with role-based filtering
   * - Admin: sees all activities
   * - Company: sees only activities from their company
   * - Employee: sees only their own activities
   */
  async findAll(
    query: GetActivitiesQueryDto,
    userRole: string,
    userId: string,
    companyId?: string
  ): Promise<{ activities: any[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Role-based access control
    if (userRole === 'admin') {
      // Admin sees all activities - no company filter
    } else if (userRole === 'company') {
      // Company sees only activities from their company
      if (companyId) {
        filter.companyId = new Types.ObjectId(companyId);
      }
    } else if (userRole === 'employee') {
      // Employee sees only their own activities
      filter.userId = new Types.ObjectId(userId);
    }

    // Search filter
    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: 'i' } },
        { resourceName: { $regex: query.search, $options: 'i' } },
        { userName: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Action type filter
    if (query.actionType && query.actionType !== 'all') {
      filter.actionType = query.actionType;
    }

    // Resource filter
    if (query.resource && query.resource !== 'all') {
      filter.resource = query.resource;
    }

    // Status filter
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // User ID filter (for admin viewing specific user's activities)
    if (query.userId && userRole === 'admin') {
      filter.userId = new Types.ObjectId(query.userId);
    }

    // Company ID filter (for admin viewing specific company's activities)
    if (query.companyId && userRole === 'admin') {
      filter.companyId = new Types.ObjectId(query.companyId);
    }

    // User role filter
    if (query.userRole && userRole === 'admin') {
      filter.userRole = query.userRole;
    }

    // Execute query
    const [activities, total] = await Promise.all([
      ActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email')
        .populate('companyId', 'name')
        .lean()
        .exec(),
      ActivityModel.countDocuments(filter),
    ]);

    return {
      activities,
      total,
      page,
      limit,
    };
  }

  /**
   * Get activity by ID
   */
  async findById(id: string) {
    return ActivityModel.findById(id)
      .populate('userId', 'fullName email')
      .populate('companyId', 'name')
      .exec();
  }

  /**
   * Get analytics data (activity summary statistics)
   */
  async getAnalytics(
    userRole: string,
    companyId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const filter: any = {};

    // Role-based filtering
    if (userRole === 'company' && companyId) {
      filter.companyId = new Types.ObjectId(companyId);
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }

    // Get total activities
    const totalActivities = await ActivityModel.countDocuments(filter);

    // Get activities by action type
    const activitiesByType = await ActivityModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get activities by resource
    const activitiesByResource = await ActivityModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get activities by status
    const activitiesByStatus = await ActivityModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get activities by user role
    const activitiesByUserRole = await ActivityModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userRole',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get top users by activity
    const topUsers = await ActivityModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      totalActivities,
      activitiesByType,
      activitiesByResource,
      activitiesByStatus,
      activitiesByUserRole,
      topUsers,
    };
  }

  /**
   * Delete activities older than specified date (for data retention policies)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await ActivityModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }
}

export default new ActivityRepository();
