import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import { validateParams, validate } from '../middlewares/validate.middleware';
import { validateQuery } from '../middlewares/validate-query.middleware';
import {
  getMyOrganisation,
  getOrganisationById,
  updateMyOrganisation,
  getAllCompanies,
  getCompanyDetails,
  getOrganisationEmployees,
  getEmployeeSkills,
  updateCompanyStatus,
} from '../controllers/organisation.controller';
import { z } from 'zod';

const router = Router();

// ======================== COMPANY PORTAL ROUTES ========================

/**
 * Company-only routes for managing their own organisation
 */
router.get('/me', authenticate, allowRoles('company'), getMyOrganisation);
router.put('/me', authenticate, allowRoles('company'), updateMyOrganisation);
router.get('/:id', authenticate, allowRoles('company'), getOrganisationById);

// ======================== ADMIN ROUTES ========================

// Validate ID parameter
const idParamSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
});

const orgIdParamSchema = z.object({
  organisationId: z.string().min(1, 'Organisation ID is required'),
});

const employeeIdParamSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
});

// Validate query parameters
const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

const statusUpdateSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Admin-only routes for managing companies
 */

// GET /admin/companies - Get all companies
router.get(
  '/admin/companies',
  authenticate,
  allowRoles('admin'),
  validateQuery(listQuerySchema),
  getAllCompanies
);

// GET /admin/companies/:companyId - Get company details
router.get(
  '/admin/companies/:companyId',
  authenticate,
  allowRoles('admin'),
  validateParams(idParamSchema),
  getCompanyDetails
);

// GET /admin/organisations/:organisationId/employees - Get employees of an organization
router.get(
  '/admin/organisations/:organisationId/employees',
  authenticate,
  allowRoles('admin'),
  validateParams(orgIdParamSchema),
  validateQuery(listQuerySchema),
  getOrganisationEmployees
);

// GET /admin/employees/:employeeId/skills - Get employee skills
router.get(
  '/admin/employees/:employeeId/skills',
  authenticate,
  allowRoles('admin'),
  validateParams(employeeIdParamSchema),
  getEmployeeSkills
);

// PUT /admin/companies/:companyId/status - Update company status
router.put(
  '/admin/companies/:companyId/status',
  authenticate,
  allowRoles('admin'),
  validateParams(idParamSchema),
  validate(statusUpdateSchema),
  updateCompanyStatus
);

export default router;
