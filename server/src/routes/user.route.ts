import { Router } from 'express';

import * as userController from '../controllers/user.controller';

import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

import { validate, validateParams } from '../middlewares/validate.middleware';
import { validateQuery } from '../middlewares/validate-query.middleware';

import {
    createUserSchema,
    updateUserSchema,
    userIdParamSchema,
    getUsersQuerySchema,
    inviteUserSchema,
    updateProfileSchema,
} from '../validators/user.validator';

import { upload } from '../utils/file-upload';

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

// Get employees by company ID - Admin only
router.get(
    '/company/:companyId/employees',
    authenticate,
    allowRoles('admin'),
    userController.getEmployeesByCompany
);

router.get(
    '/:id',
    authenticate,
    validateParams(userIdParamSchema),
    userController.getUserById
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

export default router;