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
  getEmployeeDetails,
  getEmployeeAssessments,
  getEmployeeActivity,
  exportEmployeesToExcel,
  exportEmployeesToCSV,
  exportCompanyDataExcel,
  exportCompanyDataCSV,
  createEmployeeForOrganisation,
  updateEmployeeForOrganisation,
  updateCompanyStatus,
  createCompany,
  updateCompany,
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

const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  department: z.string().optional(),
  designationId: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  isActive: z.boolean().optional(),
});

const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designationId: z.string().optional(),
  isActive: z.boolean().optional(),
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

// GET /admin/employees/:employeeId - Get employee details
router.get(
  '/admin/employees/:employeeId',
  authenticate,
  allowRoles('admin'),
  validateParams(employeeIdParamSchema),
  getEmployeeDetails
);

// GET /admin/employees/:employeeId/assessments - Get employee assessments
router.get(
  '/admin/employees/:employeeId/assessments',
  authenticate,
  allowRoles('admin'),
  validateParams(employeeIdParamSchema),
  getEmployeeAssessments
);

// GET /admin/employees/:employeeId/activity - Get employee activity
router.get(
  '/admin/employees/:employeeId/activity',
  authenticate,
  allowRoles('admin'),
  validateParams(employeeIdParamSchema),
  getEmployeeActivity
);

// GET /admin/organisations/:organisationId/employees/export/excel - Export to Excel
router.get(
  '/admin/organisations/:organisationId/employees/export/excel',
  authenticate,
  allowRoles('admin'),
  validateParams(orgIdParamSchema),
  validateQuery(listQuerySchema),
  exportEmployeesToExcel
);

// GET /admin/organisations/:organisationId/employees/export/csv - Export to CSV
router.get(
  '/admin/organisations/:organisationId/employees/export/csv',
  authenticate,
  allowRoles('admin'),
  validateParams(orgIdParamSchema),
  validateQuery(listQuerySchema),
  exportEmployeesToCSV
);

// POST /admin/organisations/:organisationId/employees - Create employee
router.post(
  '/admin/organisations/:organisationId/employees',
  authenticate,
  allowRoles('admin'),
  validateParams(orgIdParamSchema),
  validate(createEmployeeSchema),
  createEmployeeForOrganisation
);

// PUT /admin/organisations/:organisationId/employees/:employeeId - Update employee
router.put(
  '/admin/organisations/:organisationId/employees/:employeeId',
  authenticate,
  allowRoles('admin'),
  validateParams(orgIdParamSchema),
  validate(updateEmployeeSchema),
  updateEmployeeForOrganisation
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

// POST /admin/companies - Create a new company
router.post(
  '/admin/companies',
  authenticate,
  allowRoles('admin'),
  createCompany
);

// PUT /admin/companies/:companyId - Update company details
router.put(
  '/admin/companies/:companyId',
  authenticate,
  allowRoles('admin'),
  validateParams(idParamSchema),
  updateCompany
);

// GET /admin/companies/:companyId/export/excel - Export company data to Excel
router.get(
  '/admin/companies/:companyId/export/excel',
  authenticate,
  allowRoles('admin'),
  validateParams(idParamSchema),
  exportCompanyDataExcel
);

// GET /admin/companies/:companyId/export/csv - Export company data to CSV
router.get(
  '/admin/companies/:companyId/export/csv',
  authenticate,
  allowRoles('admin'),
  validateParams(idParamSchema),
  exportCompanyDataCSV
);

export default router;
