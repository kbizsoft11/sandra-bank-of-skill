import { Request, Response } from 'express';

import { userService } from '../services/user.service';

import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {

    const users =
      await userService.getAllUsers();

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

    const user =
      await userService.createUser(
        req.body
      );

    return sendResponse(
      res,
      201,
      'User created successfully',
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

    // Get the inviter's name from the authenticated user
    const invitedByName = (req as any).user?.fullName || 'Administrator';

    const result = await userService.inviteUser(
      req.body,
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