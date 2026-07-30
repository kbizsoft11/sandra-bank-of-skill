import { Router } from 'express';
import companyCategoryController from '../controllers/companyCategory.controller';
import { validate, validateParams } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import {
  createCompanyCategorySchema,
  updateCompanyCategorySchema,
  companyCategoryIdParamSchema,
  bulkEnableDisableSchema,
} from '../validators/companyCategory';

const router = Router();

/**
 * Company Category Routes
 * Manages which skill categories are enabled for each company
 */

// GET: Get enabled categories for current company (no params, uses auth)
// Query: { skip?, limit? }
router.get(
  '/company/enabled',
  authenticate,
  companyCategoryController.getEnabled
);

// GET: Get all categories for company (with companyId param)
// Query: { skip?, limit? }
router.get(
  '/company/:companyId',
  authenticate,
  companyCategoryController.getAll
);

// GET: Get all categories for a company (alias for compatibility)
router.get(
  '/company/:companyId/all',
  authenticate,
  companyCategoryController.getAll
);

// POST: Add category to company
// Body: { companyId, categoryId, enabled? }
// Admin and Company Manager
router.post(
  '/',
  authenticate,
  validate(createCompanyCategorySchema),
  companyCategoryController.create
);

// GET: Get specific company-category mapping
router.get(
  '/:id',
  authenticate,
  validateParams(companyCategoryIdParamSchema),
  companyCategoryController.getById
);

// PUT: Update company-category mapping
// Body: { enabled? }
router.put(
  '/:id',
  authenticate,
  validateParams(companyCategoryIdParamSchema),
  validate(updateCompanyCategorySchema),
  companyCategoryController.update
);

// PATCH: Enable a category for company
router.patch(
  '/:id/enable',
  authenticate,
  allowRoles('admin', 'company_manager'),
  validateParams(companyCategoryIdParamSchema),
  companyCategoryController.enable
);

// PATCH: Disable a category for company
router.patch(
  '/:id/disable',
  authenticate,
  allowRoles('admin', 'company_manager'),
  validateParams(companyCategoryIdParamSchema),
  companyCategoryController.disable
);

// DELETE: Remove category from company
// Admin and Company Manager
router.delete(
  '/:id',
  authenticate,
  allowRoles('admin', 'company_manager'),
  validateParams(companyCategoryIdParamSchema),
  companyCategoryController.delete
);

// POST: Bulk enable categories for company
// Body: { companyId, categoryIds: [] }
router.post(
  '/bulk/enable',
  authenticate,
  allowRoles('admin', 'company_manager'),
  validate(bulkEnableDisableSchema),
  companyCategoryController.bulkEnable
);

// POST: Bulk disable categories for company
// Body: { companyId, categoryIds: [] }
router.post(
  '/bulk/disable',
  authenticate,
  allowRoles('admin', 'company_manager'),
  validate(bulkEnableDisableSchema),
  companyCategoryController.bulkDisable
);

export default router;
