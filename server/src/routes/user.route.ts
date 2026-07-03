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
} from '../validators/user.validator';

const router = Router();

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

export default router;