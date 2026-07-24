import { Router } from 'express';

import * as userController from '../controllers/user.controller';

import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

import { validate, validateParams } from '../middlewares/validate.middleware';
import { validateQuery } from '../middlewares/validate-query.middleware';

import { z } from 'zod';
import {
    createUserSchema,
    updateUserSchema,
    userIdParamSchema,
    getUsersQuerySchema,
    inviteUserSchema,
    updateProfileSchema,
    searchEmployeesQuerySchema,
    allActivitiesQuerySchema,
} from '../validators/user.validator';

import { upload, importUpload } from '../utils/file-upload';

const router = Router();

// Profile routes for current user (must be before /:id routes)
router.get(
    '/me',
    authenticate,
    userController.getMyProfile
);

router.put(
    '/me',
    authenticate,
    validate(updateProfileSchema),
    userController.updateMyProfile
);

router.post(
    '/me/profile-picture',
    authenticate,
    upload.single('profileImage'),
    userController.updateProfilePicture
);

// Get all users - filtered by role
// Admin can see all users/companies
// Company can see their employees
router.get(
    '/',
    authenticate,
    validateQuery(getUsersQuerySchema),
    userController.getAllUsers
);

// Employee search endpoint - Company and Admin only
router.get(
    '/search/employees',
    authenticate,
    allowRoles('admin', 'company'),
    validateQuery(searchEmployeesQuerySchema),
    userController.searchEmployees
);

// Get all employee activities - Company and Admin only
router.get(
    '/all-activities',
    authenticate,
    allowRoles('admin', 'company'),
    validateQuery(allActivitiesQuerySchema),
    userController.getAllActivities
);

// Company skills endpoints - Company only
router.get(
    '/company-skills',
    authenticate,
    allowRoles('company'),
    userController.getCompanySkills
);

router.get(
    '/company-skills/:skillName/employees',
    authenticate,
    allowRoles('company'),
    userController.getEmployeesBySkill
);

router.get(
    '/departments',
    authenticate,
    allowRoles('admin', 'company'),
    userController.getDepartments
);

router.get(
    '/teams',
    authenticate,
    allowRoles('admin', 'company'),
    userController.getTeams
);

router.get(
    '/job-roles',
    authenticate,
    allowRoles('admin', 'company'),
    userController.getJobRoles
);

router.get(
    '/export',
    authenticate,
    allowRoles('admin', 'company'),
    userController.exportEmployees
);

router.post(
    '/import',
    authenticate,
    allowRoles('company'),
    importUpload.single('file'),
    userController.importEmployees
);

// Get employees by company ID - Admin only
router.get(
    '/company/:companyId/employees',
    authenticate,
    allowRoles('admin'),
    userController.getEmployeesByCompany
);

router.get(
    '/:id/activities',
    authenticate,
    allowRoles('admin', 'company'),
    validateParams(userIdParamSchema),
    validateQuery(allActivitiesQuerySchema),
    userController.getEmployeeActivities
);

router.get(
    '/:id/login-history',
    authenticate,
    allowRoles('admin', 'company'),
    validateParams(userIdParamSchema),
    validateQuery(allActivitiesQuerySchema),
    userController.getEmployeeLoginHistory
);

router.get(
    '/:id',
    authenticate,
    allowRoles('admin', 'company'),
    validateParams(userIdParamSchema),
    userController.getUserById
);

router.patch(
    '/:id/status',
    authenticate,
    allowRoles('admin', 'company'),
    validateParams(userIdParamSchema),
    validate(z.object({ isActive: z.boolean() })),
    userController.setEmployeeStatus
);

router.post(
    '/:id/impersonate',
    authenticate,
    allowRoles('admin', 'company'),
    validateParams(userIdParamSchema),
    userController.impersonateEmployee
);

router.post(
    '/:id/impersonate-as-company',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    userController.impersonateCompanyUser
);

// Create user - Admin only (can create employees or companies)
router.post(
    '/',
    authenticate,
    allowRoles('admin'),
    validate(createUserSchema),
    userController.createUser
);

router.put(
    '/:id',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    validate(updateUserSchema),
    userController.updateUser
);

// Upload profile picture for specific user - Admin only
router.post(
    '/:id/profile-picture',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    upload.single('profileImage'),
    userController.uploadUserProfilePicture
);

router.delete(
    '/:id',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    userController.deleteUser
);

// Invite user - Company only (can invite employees to their organization)
router.post(
    '/invite',
    authenticate,
    allowRoles('company'),
    validate(inviteUserSchema),
    userController.inviteUser
);

router.post(
    '/:id/reset-password',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    userController.resetPassword
);

router.post(
    '/:id/activate',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    userController.activateUser
);

router.post(
    '/:id/deactivate',
    authenticate,
    allowRoles('admin'),
    validateParams(userIdParamSchema),
    userController.deactivateUser
);

export default router;