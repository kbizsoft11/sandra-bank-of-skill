import { Request, Response } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';

import { authService } from '../services/auth.service';

import { LoginDto } from '../dto/login.dto';

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    return sendResponse(
      res,
      201,
      'User registered successfully',
      result
    );
  }
);


export const getMe = asyncHandler(
  async (req: Request, res: Response) => {

    return sendResponse(
      res,
      200,
      'User fetched successfully',
      req.user
    );
  }
);


export const login = asyncHandler(
  async (req: Request, res: Response) => {

    const result = await authService.login(req.body as LoginDto);

    return sendResponse(
      res,
      200,
      'Login successful',
      result
    );
  }
);