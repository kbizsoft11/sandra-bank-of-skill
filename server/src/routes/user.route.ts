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

// General user routes
router.get(
    '/',
    authenticate,
    validateQuery(getUsersQuerySchema),
    userController.getAllUsers
);

router.get(
    '/:id',
    authenticate,
    validateParams(userIdParamSchema),
    userController.getUserById
);

router.post(
    '/',
    authenticate,
    validate(createUserSchema),
    userController.createUser
);

router.put(
    '/:id',
    authenticate,
    validateParams(userIdParamSchema),
    validate(updateUserSchema),
    userController.updateUser
);

router.delete(
    '/:id',
    authenticate,
    validateParams(userIdParamSchema),
    userController.deleteUser
);

router.post(
    '/invite',
    authenticate,
    validate(inviteUserSchema),
    userController.inviteUser
);

router.post(
    '/:id/reset-password',
    authenticate,
    validateParams(userIdParamSchema),
    userController.resetPassword
);

export default router;