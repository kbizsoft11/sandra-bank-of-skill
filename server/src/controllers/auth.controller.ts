import { Request, Response } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';

import { authService } from '../services/auth.service';

import { LoginDto } from '../dto/login.dto';
import { 
  RegisterStep1Dto, 
  VerifyOTPDto, 
  RegisterStep3Dto, 
  ResendOTPDto,
  AcceptInvitationDto
} from '../dto/registration.dto';

import { userRepository } from '../repositories/user.repository';

/**
 * Legacy register endpoint (keep for backward compatibility)
 */
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

/**
 * Step 1: Initial registration - Create user account and send OTP
 * POST /api/auth/register/step1
 */
export const registerStep1 = asyncHandler(
  async (req: Request, res: Response) => {
    console.log('\n🟡 registerStep1 CONTROLLER called');
    console.log('🟡 Request body:', req.body);
    
    const result = await authService.registerStep1(req.body as RegisterStep1Dto);

    console.log('🟡 Service result:', result);

    return sendResponse(
      res,
      201,
      result.message,
      {
        email: result.email,
        expiresIn: result.expiresIn,
      }
    );
  }
);

/**
 * Step 2: Verify email with OTP
 * POST /api/auth/register/verify-otp
 */
export const verifyOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.verifyOTP(req.body as VerifyOTPDto);

    return sendResponse(
      res,
      200,
      result.message,
      {
        token: result.token,
        user: result.user,
        nextStep: result.nextStep,
      }
    );
  }
);

/**
 * Step 3: Add organisation details
 * POST /api/auth/register/step3
 * Requires authentication token from step 2
 */
export const registerStep3 = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await authService.registerStep3(
      userId,
      req.body as RegisterStep3Dto
    );

    return sendResponse(
      res,
      200,
      result.message,
      {
        organisation: result.organisation,
        nextStep: result.nextStep,
      }
    );
  }
);

/**
 * Step 4: Complete registration
 * POST /api/auth/register/complete
 * Requires authentication token
 */
export const completeRegistration = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await authService.completeRegistration(userId);

    return sendResponse(
      res,
      200,
      result.message,
      {
        token: result.token,
        user: result.user,
      }
    );
  }
);

/**
 * Resend OTP
 * POST /api/auth/register/resend-otp
 */
export const resendOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body as ResendOTPDto;

    const result = await authService.resendOTP(email);

    return sendResponse(
      res,
      200,
      result.message,
      {
        email: result.email,
        expiresIn: result.expiresIn,
      }
    );
  }
);

export const acceptInvitation = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.acceptInvitation(req.body as AcceptInvitationDto);

    return sendResponse(
      res,
      200,
      result.message,
      {
        token: result.token,
        user: result.user,
      }
    );
  }
);

/**
 * Get authenticated user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return sendResponse(
      res,
      200,
      'Authenticated user fetched successfully',
      user
    );
  }
);

/**
 * Login
 * POST /api/auth/login
 */
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

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userFullName = req.user?.fullName || 'User';
    const tenantId = req.user?.tenantId;
    const organisationId = req.user?.organisationId;

    if (userId) {
      const AdminDashboardService = require('../services/admin-dashboard.service');
      await AdminDashboardService.createActivity(
        userId,
        userFullName,
        'Logged out successfully',
        'logout',
        {
          tenantId,
          organisationId,
        }
      );
    }

    return sendResponse(
      res,
      200,
      'Logout successful'
    );
  }
);
