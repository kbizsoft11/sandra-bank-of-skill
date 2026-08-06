import { Router } from 'express';
import activityController from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

/**
 * All activity routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/activities/analytics - Get activity analytics (MUST be before /:id route)
 * - Admin and Company can view
 * - Employee cannot view
 */
router.get('/analytics', activityController.getAnalytics);

/**
 * GET /api/activities - Get all activities (with role-based filtering)
 * - Admin: sees all activities
 * - Company: sees only their company's activities
 * - Employee: sees only their own activities
 */
router.get('/', activityController.getActivities);

/**
 * GET /api/activities/:id - Get single activity (with permission check)
 */
router.get('/:id', activityController.getActivityById);

/**
 * POST /api/activities - Create activity log (admin only, typically called internally)
 */
router.post('/', allowRoles('admin'), activityController.createActivity);

export default router;
