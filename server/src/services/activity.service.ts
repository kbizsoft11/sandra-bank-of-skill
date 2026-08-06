import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/api-error';
import activityRepository from '../repositories/activity.repository';
import { Schema, Types } from 'mongoose';
import { Request } from 'express';

interface LogActivityDto {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'company' | 'employee';
  actionType: string;
  resource: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  status?: 'success' | 'failure' | 'pending';
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { old: any; new: any }>;
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Activity Service - handles activity logging and retrieval
 * Ensures that only essential actions are logged
 * Respects role-based access control for viewing logs
 */
class ActivityService {
  /**
   * Log an activity
   */
  async logActivity(data: LogActivityDto): Promise<any> {
    try {
      console.log('📝 ActivityService.logActivity called with:');
      console.log('  - userId:', data.userId, 'type:', typeof data.userId);
      console.log('  - actionType:', data.actionType);
      console.log('  - resource:', data.resource);
      console.log('  - description:', data.description);

      // Convert to hex strings if they're ObjectId objects
      const userIdStr = this.extractIdString(data.userId);
      const resourceIdStr = data.resourceId ? this.extractIdString(data.resourceId) : undefined;
      const companyIdStr = data.companyId ? this.extractIdString(data.companyId) : undefined;

      console.log('📝 After extraction:');
      console.log('  - userIdStr:', userIdStr);
      console.log('  - resourceIdStr:', resourceIdStr);
      console.log('  - companyIdStr:', companyIdStr);

      // Validate userId - it's required
      if (!userIdStr) {
        console.error('Error logging activity: userId is required or invalid');
        return null;
      }

      // Pass as plain strings, let the model/repository handle conversion
      const activity = await activityRepository.create({
        userId: userIdStr,
        userName: data.userName,
        userEmail: data.userEmail,
        userRole: data.userRole,
        actionType: data.actionType,
        resource: data.resource,
        resourceId: resourceIdStr,
        resourceName: data.resourceName,
        description: data.description,
        status: data.status || 'success',
        companyId: companyIdStr,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        changes: data.changes,
        details: data.details,
        errorMessage: data.errorMessage,
      } as any);

      console.log('📝 Activity created successfully:', activity?._id);
      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error - logging should never break main flow
      // Silently fail if activity logging fails
      return null;
    }
  }

  /**
   * Extract a valid MongoDB ObjectId string from various formats
   */
  private extractIdString(value: any): string | null {
    if (!value) return null;

    // If it's already a string, validate it's a valid hex string
    if (typeof value === 'string') {
      // Check if it's a valid 24-char hex string
      if (/^[0-9a-f]{24}$/i.test(value)) {
        return value;
      }
      return null;
    }

    // If it's a Mongoose ObjectId
    if (value.toString && typeof value.toString === 'function') {
      const strValue = value.toString();
      // Check if result is valid hex string
      if (/^[0-9a-f]{24}$/i.test(strValue)) {
        return strValue;
      }
    }

    // If it has a _id property
    if (value._id) {
      return this.extractIdString(value._id);
    }

    return null;
  }

  /**
   * Get activities with role-based filtering
   */
  async getActivities(
    query: any,
    userRole: string,
    userId: string,
    companyId?: string
  ): Promise<any> {
    if (!userRole || !userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await activityRepository.findAll(query, userRole, userId, companyId);

    return result;
  }

  /**
   * Get single activity
   */
  async getActivityById(id: string, userRole: string, userId: string, companyId?: string): Promise<any> {
    const activity = await activityRepository.findById(id);

    if (!activity) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Activity not found');
    }

    // Role-based access control
    if (userRole === 'admin') {
      // Admin can view all activities
      return activity;
    } else if (userRole === 'company' && companyId) {
      // Company can only view activities from their company
      if ((activity as any).companyId?.toString() !== companyId) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this activity');
      }
      return activity;
    } else if (userRole === 'employee') {
      // Employee can only view their own activities
      if ((activity as any).userId?.toString() !== userId) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this activity');
      }
      return activity;
    }

    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this activity');
  }

  /**
   * Get analytics data
   */
  async getAnalytics(
    userRole: string,
    companyId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    if (userRole === 'employee') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Employees cannot view analytics');
    }

    const analytics = await activityRepository.getAnalytics(userRole, companyId, startDate, endDate);

    return analytics;
  }

  /**
   * Helper to extract IP address from request
   */
  static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      const ipString = Array.isArray(ips) ? ips[0] : forwarded;
      return (ipString as string).trim();
    }
    return (req.socket?.remoteAddress as string) || 'Unknown';
  }

  /**
   * Helper to extract user agent from request
   */
  static getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'Unknown';
  }

  /**
   * Helper function to create activity data from request context
   * Usage: const activityData = ActivityService.createActivityData(req, { actionType, resource, ... })
   */
  static createActivityData(
    req: Request,
    data: Partial<LogActivityDto>
  ): LogActivityDto {
    const user = (req as any).user;

    return {
      userId: user?.userId,
      userName: user?.fullName || 'Unknown',
      userEmail: user?.email || '',
      userRole: user?.role,
      actionType: data.actionType || '',
      resource: data.resource || '',
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      description: data.description || '',
      status: data.status || 'success',
      companyId: user?.organisationId,
      ipAddress: ActivityService.getClientIp(req),
      userAgent: ActivityService.getUserAgent(req),
      changes: data.changes,
      details: data.details,
      errorMessage: data.errorMessage,
    };
  }
}

export default new ActivityService();
export { ActivityService };
