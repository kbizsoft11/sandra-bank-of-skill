import { Request, Response } from 'express';
import * as companyAnalyticsService from '../services/company-analytics.service';

/**
 * GET /analytics/companies
 * Get company analytics (admin only)
 * Query params: startDate (optional), endDate (optional) - format: YYYY-MM-DD
 */
export const getCompanyAnalytics = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Extract optional date filter from query params
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const analytics = await companyAnalyticsService.getCompanyAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Company analytics retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error fetching company analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching company analytics',
      error: error.message,
    });
  }
};

/**
 * GET /analytics/companies/export
 * Export company analytics data (admin only)
 */
export const exportCompanyAnalytics = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Extract optional date filter from query params
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const analytics = await companyAnalyticsService.getCompanyAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Company analytics export data retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error exporting company analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting company analytics',
      error: error.message,
    });
  }
};
