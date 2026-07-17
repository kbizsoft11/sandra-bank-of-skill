import { Request, Response } from 'express';

import { userService } from '../services/user.service';

import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { userRepository } from '../repositories/user.repository';

export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    
    const users =
      await userService.getAllUsers(userRole, userTenantId);

    return sendResponse(
      res,
      200,
      'Users fetched successfully',
      users
    );

  }
);

export const getUserById = asyncHandler(
  async (req: Request, res: Response) => {

    const user =
      await userService.getUserById(
        req.params.id as string
      );

    return sendResponse(
      res,
      200,
      'User fetched successfully',
      user
    );

  }
);

export const createUser = asyncHandler(
  async (req: Request, res: Response) => {

    const adminId = (req as any).user?.userId;
    const adminName = (req as any).user?.fullName;

    const user =
      await userService.createUser(
        req.body,
        adminId,
        adminName
      );

    return sendResponse(
      res,
      201,
      'Company user created successfully and invitation email sent',
      user
    );

  }
);

export const updateUser = asyncHandler(
  async (req: Request, res: Response) => {

    const user =
      await userService.updateUser(
        req.params.id as string,
        req.body
      );

    return sendResponse(
      res,
      200,
      'User updated successfully',
      user
    );

  }
);

export const deleteUser = asyncHandler(
  async (req: Request, res: Response) => {

    await userService.deleteUser(
      req.params.id as string
    );

    return sendResponse(
      res,
      200,
      'User deleted successfully'
    );

  }
);

export const inviteUser = asyncHandler(
  async (req: Request, res: Response) => {

    // Get the inviter's details from the authenticated user
    const invitedByUserId = (req as any).user?.userId;

    const inviter = await userRepository.findById(invitedByUserId);
    const invitedByName = inviter?.fullName || 'Administrator';

    const result = await userService.inviteUser(
      req.body,
      invitedByUserId,
      invitedByName
    );

    return sendResponse(
      res,
      201,
      result.message,
      result.user
    );

  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {

    // Get the resetter's name from the authenticated user
    const resetByName = (req as any).user?.fullName || 'Administrator';

    const result = await userService.resetUserPassword(
      req.params.id as string,
      resetByName
    );

    return sendResponse(
      res,
      200,
      result.message
    );

  }
);

export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;

    const user = await userService.getMyProfile(userId);

    return sendResponse(
      res,
      200,
      'Profile fetched successfully',
      user
    );

  }
);

export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;

    const user = await userService.updateMyProfile(userId, req.body);

    return sendResponse(
      res,
      200,
      'Profile updated successfully',
      user
    );

  }
);

export const updateProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const user = await userService.updateProfilePicture(userId, req.file.filename);

    return sendResponse(
      res,
      200,
      'Profile picture updated successfully',
      user
    );

  }
);

export const uploadUserProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {

    const { id } = req.params;

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const user = await userService.updateProfilePicture(id as string, req.file.filename);

    return sendResponse(
      res,
      200,
      'Profile picture uploaded successfully',
      user
    );

  }
);

export const getEmployeesByCompany = asyncHandler(
  async (req: Request, res: Response) => {

    const employees = await userService.getEmployeesByCompany(
      req.params.companyId as string
    );

    return sendResponse(
      res,
      200,
      'Employees fetched successfully',
      employees
    );

  }
);

export const searchEmployees = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    const { search, skill, category, department, page, limit } = req.query;

    const result = await userService.searchEmployees({
      search: search as string,
      skill: skill as string,
      category: category as string,
      department: department as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userRole,
      userTenantId,
    });

    return sendResponse(
      res,
      200,
      'Employees search completed successfully',
      result
    );

  }
);

export const getCompanySkills = asyncHandler(
  async (req: Request, res: Response) => {

    const userTenantId = (req as any).user?.tenantId;

    const skills = await userService.getCompanySkills(userTenantId);

    return sendResponse(
      res,
      200,
      'Company skills fetched successfully',
      skills
    );

  }
);

export const getEmployeesBySkill = asyncHandler(
  async (req: Request, res: Response) => {

    const userTenantId = (req as any).user?.tenantId;
    const { skillName } = req.params;

    const employees = await userService.getEmployeesBySkill(
      skillName as string,
      userTenantId
    );

    return sendResponse(
      res,
      200,
      'Employees with skill fetched successfully',
      employees
    );

  }
);
