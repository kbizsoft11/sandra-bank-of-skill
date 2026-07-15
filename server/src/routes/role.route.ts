import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import { validate, validateParams } from '../middlewares/validate.middleware';
import { validateQuery } from '../middlewares/validate-query.middleware';
import {
    createRoleSchema,
    updateRoleSchema,
    roleIdParamSchema,
    getRolesQuerySchema,
} from '../validators/role.validator';

const router = Router();

// All role routes require authentication and company role
router.use(authenticate, allowRoles('company'));

// Get all roles for the company
router.get(
    '/',
    validateQuery(getRolesQuerySchema),
    roleController.getAllRoles
);

// Get role by ID
router.get(
    '/:id',
    validateParams(roleIdParamSchema),
    roleController.getRoleById
);

// Create new role
router.post(
    '/',
    validate(createRoleSchema),
    roleController.createRole
);

// Update role
router.put(
    '/:id',
    validateParams(roleIdParamSchema),
    validate(updateRoleSchema),
    roleController.updateRole
);

// Delete role
router.delete(
    '/:id',
    validateParams(roleIdParamSchema),
    roleController.deleteRole
);

export default router;
