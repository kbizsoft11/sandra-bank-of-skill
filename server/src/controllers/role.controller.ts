import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import { roleService } from '../services/role.service';

/**
 * Create a new role
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!tenantId || !organisationId) {
        return sendResponse(res, 400, 'Invalid user context');
    }

    const result = await roleService.createRole(req.body, tenantId, organisationId);

    return sendResponse(res, 201, result.message, result.role);
});

/**
 * Get all roles for the company
 */
export const getAllRoles = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!tenantId || !organisationId) {
        return sendResponse(res, 400, 'Invalid user context');
    }

    const isActive = (req as any).query?.isActive;

    const roles = await roleService.getAllRoles(tenantId, organisationId, isActive);

    return sendResponse(res, 200, 'Roles fetched successfully', roles);
});

/**
 * Get role by ID
 */
export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!tenantId || !organisationId) {
        return sendResponse(res, 400, 'Invalid user context');
    }

    const role = await roleService.getRoleById(req.params.id as string, tenantId, organisationId);

    return sendResponse(res, 200, 'Role fetched successfully', role);
});

/**
 * Update role
 */
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!tenantId || !organisationId) {
        return sendResponse(res, 400, 'Invalid user context');
    }

    const result = await roleService.updateRole(
        req.params.id as string,
        req.body,
        tenantId,
        organisationId
    );

    return sendResponse(res, 200, result.message, result.role);
});

/**
 * Delete role
 */
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!tenantId || !organisationId) {
        return sendResponse(res, 400, 'Invalid user context');
    }

    const result = await roleService.deleteRole(req.params.id as string, tenantId, organisationId);

    return sendResponse(res, 200, result.message);
});
