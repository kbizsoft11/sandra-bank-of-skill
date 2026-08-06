import { Request, Response } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';

import { authService } from '../services/auth.service';
import activityService, { ActivityService } from '../services/activity.service';
import { ACTIVITY_TYPES, RESOURCE_TYPES } from '../constants/activity-types';

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
    
    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);
    
    const result = await authService.registerStep1(req.body as RegisterStep1Dto, ipAddress, userAgent);

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

    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);

    const result = await authService.completeRegistration(userId, ipAddress, userAgent);

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
    console.log('🟢 LOGIN CONTROLLER: Starting login process');
    console.log('🟢 LOGIN CONTROLLER: Extracting IP address and user agent');
    
    // Extract IP address from request
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.connection.remoteAddress) ||
      'unknown';
    
    // Extract user agent from request
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log('🟢 LOGIN CONTROLLER: IP Address:', ipAddress);
    console.log('🟢 LOGIN CONTROLLER: User Agent:', userAgent);
    
    const result = await authService.login(req.body as LoginDto, ipAddress, userAgent);

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
    const userEmail = req.user?.email || '';
    const userRole = (req.user?.role as 'admin' | 'company' | 'employee') || 'employee';
    const organisationId = req.user?.organisationId;

    console.log('🔵 LOGOUT: Attempting to log logout activity');
    console.log('🔵 LOGOUT: userId =', userId, 'type =', typeof userId);
    console.log('🔵 LOGOUT: userFullName =', userFullName);
    console.log('🔵 LOGOUT: userRole =', userRole);
    console.log('🔵 LOGOUT: organisationId =', organisationId);

    // Extract IP address from request
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.socket?.remoteAddress) ||
      'unknown';
    
    // Extract user agent from request
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log('🔵 LOGOUT: IP Address:', ipAddress);
    console.log('🔵 LOGOUT: User Agent:', userAgent);

    if (userId) {
      // Ensure userId is a string
      const userIdStr = String(userId);
      const resourceIdStr = String(userId);
      const companyIdStr = organisationId ? String(organisationId) : undefined;

      console.log('🔵 LOGOUT: Calling logActivity with:');
      console.log('  - userId:', userIdStr);
      console.log('  - resourceId:', resourceIdStr);
      console.log('  - companyId:', companyIdStr);
      console.log('  - ipAddress:', ipAddress);
      console.log('  - userAgent:', userAgent);

      // Log logout activity using new activity service
      const result = await activityService.logActivity({
        userId: userIdStr,
        userName: userFullName,
        userEmail: userEmail,
        userRole: userRole,
        actionType: ACTIVITY_TYPES.LOGOUT,
        resource: RESOURCE_TYPES.USER,
        resourceId: resourceIdStr,
        resourceName: userFullName,
        description: `${userFullName} logged out successfully`,
        status: 'success',
        companyId: companyIdStr,
        ipAddress: ipAddress,
        userAgent: userAgent,
      });

      console.log('🔵 LOGOUT: Activity logged, result:', !!result);
    }

    return sendResponse(
      res,
      200,
      'Logout successful'
    );
  }
);
