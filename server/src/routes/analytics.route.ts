import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

/**
 * GET /analytics/skill-categories
 * Get skill category analytics
 * Admin only
 */
router.get(
  '/skill-categories',
  authenticate,
  allowRoles('admin'),
  analyticsController.getSkillCategoryAnalytics
);

/**
 * GET /analytics/skills
 * Get skill analytics
 * Admin only
 */
router.get(
  '/skills',
  authenticate,
  allowRoles('admin'),
  analyticsController.getSkillAnalytics
);

/**
 * GET /analytics/skill-categories/export
 * Export skill category analytics data (no pagination, full dataset)
 * Admin only
 * Query params:
 * - limit (optional): max number of records to export
 */
router.get(
  '/skill-categories/export',
  authenticate,
  allowRoles('admin'),
  analyticsController.exportSkillCategoryAnalytics
);

/**
 * GET /analytics/skills/export
 * Export skill analytics data (no pagination, full dataset)
 * Admin only
 * Query params:
 * - limit (optional): max number of records to export
 */
router.get(
  '/skills/export',
  authenticate,
  allowRoles('admin'),
  analyticsController.exportSkillAnalytics
);

/**
 * GET /analytics/companies
 * Get company analytics
 * Admin only
 */
router.get(
  '/companies',
  authenticate,
  allowRoles('admin'),
  analyticsController.getCompanyAnalytics
);

/**
 * GET /analytics/companies/export
 * Export company analytics data (no pagination, full dataset)
 * Admin only
 * Query params:
 * - limit (optional): max number of records to export
 */
router.get(
  '/companies/export',
  authenticate,
  allowRoles('admin'),
  analyticsController.exportCompanyAnalytics
);

/**
 * GET /analytics/employees
 * Get employee analytics
 * Admin only
 */
router.get(
  '/employees',
  authenticate,
  allowRoles('admin'),
  analyticsController.getEmployeeAnalytics
);

/**
 * GET /analytics/employees/export
 * Export employee analytics data (no pagination, full dataset)
 * Admin only
 * Query params:
 * - limit (optional): max number of records to export
 */
router.get(
  '/employees/export',
  authenticate,
  allowRoles('admin'),
  analyticsController.exportEmployeeAnalytics
);

export default router;
