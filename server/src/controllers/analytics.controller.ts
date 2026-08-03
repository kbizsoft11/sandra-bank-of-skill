import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import * as companyAnalyticsService from '../services/company-analytics.service';
import * as employeeAnalyticsService from '../services/employee-analytics.service';

/**
 * GET /analytics/skill-categories
 * Get skill category analytics (admin only)
 * Query params: startDate (optional), endDate (optional) - format: YYYY-MM-DD
 */
export const getSkillCategoryAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await analyticsService.getSkillCategoryAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Skill category analytics retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error fetching skill category analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching skill category analytics',
      error: error.message,
    });
  }
};

/**
 * GET /analytics/skills
 * Get skill analytics (admin only)
 * Query params: startDate (optional), endDate (optional) - format: YYYY-MM-DD
 */
export const getSkillAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await analyticsService.getSkillAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Skill analytics retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error fetching skill analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching skill analytics',
      error: error.message,
    });
  }
};

/**
 * GET /analytics/skill-categories/export
 * Export skill category analytics data (admin only)
 */
export const exportSkillCategoryAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await analyticsService.getSkillCategoryAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Skill category analytics export data retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error exporting skill category analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting skill category analytics',
      error: error.message,
    });
  }
};

/**
 * GET /analytics/skills/export
 * Export skill analytics data (admin only)
 */
export const exportSkillAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await analyticsService.getSkillAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Skill analytics export data retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error exporting skill analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting skill analytics',
      error: error.message,
    });
  }
};

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

/**
 * GET /analytics/employees
 * Get employee analytics (admin only)
 * Query params: startDate (optional), endDate (optional) - format: YYYY-MM-DD
 */
export const getEmployeeAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await employeeAnalyticsService.getEmployeeAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Employee analytics retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error fetching employee analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching employee analytics',
      error: error.message,
    });
  }
};

/**
 * GET /analytics/employees/export
 * Export employee analytics data (admin only)
 */
export const exportEmployeeAnalytics = async (req: Request, res: Response) => {
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

    const analytics = await employeeAnalyticsService.getEmployeeAnalytics(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Employee analytics export data retrieved successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error exporting employee analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting employee analytics',
      error: error.message,
    });
  }
};
