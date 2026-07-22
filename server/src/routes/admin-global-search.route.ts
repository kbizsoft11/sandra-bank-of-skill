import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import * as AdminGlobalSearchController from '../controllers/admin-global-search.controller';

const router = Router();

/**
 * GET /admin/global-search/dashboard
 * Get dashboard summary
 */
router.get(
  '/dashboard',
  authenticate,
  allowRoles('admin'),
  AdminGlobalSearchController.getDashboardSummary
);

/**
 * GET /admin/global-search
 * Perform global search
 */
router.get(
  '/',
  authenticate,
  allowRoles('admin'),
  AdminGlobalSearchController.globalSearch
);

export default router;
