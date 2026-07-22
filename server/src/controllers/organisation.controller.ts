// organisation.controller.ts

import { Request, Response } from 'express';
import { organisationService } from '../services/organisation.service';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { userService } from '../services/user.service';
import { userRepository } from '../repositories/user.repository';

// ======================== COMPANY PORTAL ROUTES ========================

/**
 * Get my organisation (for company portal)
 * Company users only
 */
export const getMyOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const organisationId = (req as any).user?.organisationId;

    if (!organisationId) {
      return sendResponse(
        res,
        404,
        'Organisation not found'
      );
    }

    // Fetch organisation (would need an Organisation repository)
    // For now, return the user's organisation context
    const user = await userRepository.findById(userId);

    return sendResponse(
      res,
      200,
      'Organisation fetched successfully',
      user
    );
  }
);

/**
 * Get organisation by ID (for company portal)
 * Company users can view their own organisation
 */
export const getOrganisationById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userTenantId = (req as any).user?.tenantId;
    const userRole = (req as any).user?.role;

    const user = await userRepository.findById(id);

    if (!user) {
      return sendResponse(res, 404, 'Organisation not found');
    }

    // Company users can only view their own organisation
    if (userRole === 'company' && user.tenantId !== userTenantId) {
      return sendResponse(res, 403, 'Access denied');
    }

    return sendResponse(
      res,
      200,
      'Organisation fetched successfully',
      user
    );
  }
);

/**
 * Update my organisation (for company portal)
 * Company users only
 */
export const updateMyOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    const user = await userService.updateMyProfile(userId, req.body);

    return sendResponse(
      res,
      200,
      'Organisation updated successfully',
      user
    );
  }
);

// ======================== ADMIN ROUTES ========================

/**
 * Get all companies (admin only)
 * Supports search and status filtering
 */
export const getAllCompanies = asyncHandler(
  async (req: Request, res: Response) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await organisationService.getAllCompanies(page, limit, {
      search,
      status,
    });

    return sendResponse(
      res,
      200,
      'Companies fetched successfully',
      result
    );
  }
);

/**
 * Get company details (admin only)
 * Returns company info and statistics
 */
export const getCompanyDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const company = await organisationService.getCompanyDetails(companyId);

    if (!company) {
      return sendResponse(res, 404, 'Company not found');
    }

    return sendResponse(
      res,
      200,
      'Company details fetched successfully',
      company
    );
  }
);

/**
 * Get employees of an organization (admin only)
 * Supports search and status filtering
 */
export const getOrganisationEmployees = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await organisationService.getEmployeesByOrganisation(
      organisationId,
      page,
      limit,
      { search, status }
    );

    return sendResponse(
      res,
      200,
      'Organisation employees fetched successfully',
      result
    );
  }
);

/**
 * Get employee skills (admin only)
 * Returns read-only skills for a specific employee
 */
export const getEmployeeSkills = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;

    const skills = await organisationService.getEmployeeSkills(employeeId);

    return sendResponse(
      res,
      200,
      'Employee skills fetched successfully',
      skills
    );
  }
);

/**
 * Update company status (activate/deactivate)
 * Admin only
 */
export const updateCompanyStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendResponse(res, 400, 'isActive must be a boolean');
    }

    const company = await organisationService.updateCompanyStatus(
      companyId,
      isActive
    );

    return sendResponse(
      res,
      200,
      `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
      company
    );
  }
);
