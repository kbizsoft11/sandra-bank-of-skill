// user.controller.ts

import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { userService } from '../services/user.service';
import { Request, Response } from 'express';

export const getAllUsers = asyncHandler(
  async (req: Request, res:Response) => {
    const users = await userService.getAllUsers();

    return sendResponse(
      res,
      200,
      'Users fetched successfully',
      users
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
