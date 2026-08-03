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

export default router;
