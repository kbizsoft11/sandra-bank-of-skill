import { Request, Response } from 'express';
import * as AdminGlobalSearchService from '../services/admin-global-search.service';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';

/**
 * GET /admin/global-search/dashboard
 * Get dashboard summary for current month
 */
export const getDashboardSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const data = await AdminGlobalSearchService.getDashboardSummary();

    return sendResponse(
      res,
      200,
      'Dashboard summary fetched successfully',
      data
    );
  }
);

/**
 * GET /admin/global-search
 * Perform global search across all entities
 */
export const globalSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const {
      search,
      entity,
      status,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await AdminGlobalSearchService.performGlobalSearch({
      search: search as string,
      entity: entity as any,
      status: status as any,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return sendResponse(
      res,
      200,
      'Global search completed successfully',
      result
    );
  }
);
