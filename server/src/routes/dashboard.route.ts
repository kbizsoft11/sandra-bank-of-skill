import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCompletedOnboarding } from '../middlewares/onboarding.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

/**
 * GET /dashboard/admin/stats
 * Get admin dashboard statistics
 */
router.get(
  '/admin/stats',
  authenticate,
  allowRoles('admin'),
  dashboardController.getAdminStats
);

/**
 * GET /dashboard/company/stats
 * Get company dashboard statistics
 */
router.get(
  '/company/stats',
  authenticate,
  allowRoles('company'),
  dashboardController.getCompanyStats
);

/**
 * GET /dashboard/employee/stats
 * Get employee dashboard statistics
 */
router.get(
  '/employee/stats',
  authenticate,
  allowRoles('employee'),
  requireCompletedOnboarding,
  dashboardController.getEmployeeStats
);

export default router;
