import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import { roleService } from '../services/role.service';
import { UserModel } from '../models/user.model';

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
 * Get all roles for the company/organisation
 * GET /api/roles
 * For company users: uses their organisationId from JWT
 * For admin users: pass organisationId as query parameter (?organisationId=id)
 */
export const getAllRoles = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    const userOrganisationId = (req as any).user?.organisationId;
    const queryOrganisationId = req.query.organisationId as string;

    console.log('[getAllRoles] Request:', {
        userRole,
        userTenantId,
        userOrganisationId,
        queryOrganisationId,
    });

    let tenantId: string | null = null;
    let organisationId: string | null = null;

    // Determine which organisationId to use
    if (userRole === 'admin') {
        // Admin must pass organisationId in query
        if (!queryOrganisationId) {
            console.log('[getAllRoles] Admin user missing organisationId parameter');
            return sendResponse(res, 400, 'organisationId parameter is required');
        }
        organisationId = queryOrganisationId;

        // Get organisation to extract tenantId
        const { Organisation } = await import('../models/organisation.model');
        const org = await Organisation.findById(organisationId);
        if (!org) {
            console.log('[getAllRoles] Organisation not found:', organisationId);
            return sendResponse(res, 404, 'Organisation not found');
        }
        tenantId = org.tenantId;
        console.log('[getAllRoles] Admin: Using organisation', { organisationId, tenantId });
    } 
    else if (userRole === 'company') {
        // Company user uses their own organisationId
        if (!userOrganisationId || !userTenantId) {
            console.log('[getAllRoles] Company user missing context:', { userOrganisationId, userTenantId });
            return sendResponse(res, 400, 'User context not found');
        }
        organisationId = userOrganisationId;
        tenantId = userTenantId;
        console.log('[getAllRoles] Company: Using user organisation', { organisationId, tenantId });
    }
    else {
        console.log('[getAllRoles] User role not allowed:', userRole);
        return sendResponse(res, 403, 'Access denied');
    }

    if (!tenantId || !organisationId) {
        console.log('[getAllRoles] Missing required IDs:', { tenantId, organisationId });
        return sendResponse(res, 400, 'Invalid context');
    }

    console.log('[getAllRoles] Fetching roles:', { tenantId, organisationId });
    const roles = await roleService.getAllRoles(tenantId, organisationId);

    console.log('[getAllRoles] Found roles:', roles.length);
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
