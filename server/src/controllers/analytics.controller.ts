import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';

/**
 * GET /analytics/skill-categories
 * Get skill category analytics (admin only)
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

    const analytics = await analyticsService.getSkillCategoryAnalytics();

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

