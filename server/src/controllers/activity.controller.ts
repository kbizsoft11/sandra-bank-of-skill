import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import activityService, { ActivityService } from '../services/activity.service';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

class ActivityController {
  /**
   * Get all activities (with role-based filtering)
   * GET /api/activities
   * Query params: page, limit, search, actionType, resource, status, startDate, endDate, userId (admin only), companyId (admin only)
   */
  getActivities = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.organisationId;

    if (!userRole || !userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await activityService.getActivities(req.query as any, userRole, userId, companyId);

    return sendResponse(res, StatusCodes.OK, 'Activities retrieved successfully', result);
  });

  /**
   * Get single activity
   * GET /api/activities/:id
   */
  getActivityById = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;
    const companyId = (req as any).user?.organisationId;

    if (!userRole || !userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const activityId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const activity = await activityService.getActivityById(activityId, userRole, userId, companyId);

    return sendResponse(res, StatusCodes.OK, 'Activity retrieved successfully', activity);
  });

  /**
   * Create activity log (typically called internally, but can be used for manual logging)
   * POST /api/activities
   */
  createActivity = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    // Only admins can manually create activity logs
    if (user.role !== 'admin') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can create activity logs');
    }

    const activityData = ActivityService.createActivityData(req, req.body);
    const activity = await activityService.logActivity(activityData);

    if (!activity) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create activity log');
    }

    return sendResponse(res, StatusCodes.CREATED, 'Activity logged successfully', activity);
  });

  /**
   * Get activity analytics
   * GET /api/activities/analytics
   * Query params: startDate, endDate
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    if (!userRole) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (userRole === 'employee') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Employees cannot view analytics');
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const analytics = await activityService.getAnalytics(userRole, companyId, startDate, endDate);

    return sendResponse(res, StatusCodes.OK, 'Analytics retrieved successfully', analytics);
  });
}

export default new ActivityController();
