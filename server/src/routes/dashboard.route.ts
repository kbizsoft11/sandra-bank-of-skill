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

/**
 * GET /dashboard/company/about
 * Get company dashboard about tab data
 */
router.get(
  '/company/about',
  authenticate,
  allowRoles('company'),
  dashboardController.getCompanyAbout
);

/**
 * GET /dashboard/company/assessments
 * Get company dashboard assessments tab data
 */
router.get(
  '/company/assessments',
  authenticate,
  allowRoles('company'),
  dashboardController.getCompanyAssessments
);

/**
 * GET /dashboard/admin/overview
 * Get admin dashboard overview statistics
 */
router.get(
  '/admin/overview',
  authenticate,
  allowRoles('admin'),
  dashboardController.getAdminOverview
);

/**
 * GET /dashboard/admin/charts
 * Get admin dashboard chart data
 */
router.get(
  '/admin/charts',
  authenticate,
  allowRoles('admin'),
  dashboardController.getAdminCharts
);

/**
 * GET /dashboard/admin/notifications
 * Get admin notifications
 */
router.get(
  '/admin/notifications',
  authenticate,
  allowRoles('admin'),
  dashboardController.getAdminNotifications
);

/**
 * PUT /dashboard/admin/notifications/:id/read
 * Mark notification as read
 */
router.put(
  '/admin/notifications/:id/read',
  authenticate,
  allowRoles('admin'),
  dashboardController.markNotificationAsRead
);

/**
 * PUT /dashboard/admin/notifications/:id/unread
 * Mark notification as unread
 */
router.put(
  '/admin/notifications/:id/unread',
  authenticate,
  allowRoles('admin'),
  dashboardController.markNotificationAsUnread
);

/**
 * GET /dashboard/admin/recent-activities
 * Get recent activities
 */
router.get(
  '/admin/recent-activities',
  authenticate,
  allowRoles('admin'),
  dashboardController.getAdminRecentActivities
);

export default router;
