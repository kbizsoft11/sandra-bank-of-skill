import { 
  RegisterDto,
  RegisterStep1Dto, 
  VerifyOTPDto, 
  RegisterStep3Dto,
  AcceptInvitationDto
} from '../dto/registration.dto';
import { LoginDto } from '../dto/login.dto';

import { userRepository } from '../repositories/user.repository';
import { organisationRepository } from '../repositories/organisation.repository';

import { ApiError } from '../utils/api-error';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import { AccountStatus } from '../types/common.types';
import { 
  generateOTP, 
  hashOTP, 
  compareOTP, 
  isOTPExpired, 
  getOTPExpiry, 
  maskEmail 
} from '../utils/otp.util';
import { generateTenantIdFromName } from '../utils/tenant.util';
import { sendVerificationEmail, sendWelcomeEmail } from './email.service';
import * as AdminDashboardService from './admin-dashboard.service';


const logOtpForDevelopment = (
  email: string,
  otp: string,
  source: 'register' | 'resend'
) => {

  if(process.env.NODE_ENV !== 'production') {

  console.log('\n========== REGISTRATION OTP ==========');
  console.log('Source:', source);
  console.log('Email:', email);
  console.log('OTP:', otp);
  console.log('======================================\n');

  }
};

export const authService = {
  /**
   * Legacy register method (keep for backward compatibility)
   */
  register: async (payload: RegisterDto) => {
    const fullName = payload.fullName?.trim();

    if (!fullName) {
      throw new ApiError(400, 'Full name is required');
    }

    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await userRepository.create({
      fullName,
      email: payload.email,
      password: hashedPassword,
      role: 'employee',
      tenantId: 'company-1',
      profileCompleted: false,
      isActive: true,
      hasCompletedOnboarding: false,
    });

    // Auto-assign onboarding questionnaires to employees
    if (user.role === 'employee' && user.tenantId) {
      const { assignOnboardingQuestionnaires } = require('./onboarding.service');
      // For legacy register, we might not have organisationId, so use tenantId
      const orgId = user.organisationId || user.tenantId;
      if (orgId) {
        await assignOnboardingQuestionnaires(
          user._id.toString(),
          user.tenantId,
          orgId,
          user.tenantId // assignedBy - use tenant admin
        );
      }
    }

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organisationId: user.organisationId,
    });

    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    return {
      user: userResponse,
      token,
    };
  },

  /**
   * Step 1: Initial registration - Create user account and send OTP
   */
  registerStep1: async (payload: RegisterStep1Dto) => {
    console.log('\n🔵 registerStep1 called');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Payload body:', payload);
    
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser && existingUser.emailVerified) {
      throw new ApiError(
        409,
        'Email is already registered. Please login instead.'
      );
    }

    const fullName = payload.fullName?.trim();

    if (!fullName) {
      throw new ApiError(400, 'Full name is required');
    }

    // Hash password
    const hashedPassword = await hashPassword(payload.password);

    // Generate OTP
    const otp = generateOTP();
    console.log('🔵 Generated OTP:', otp);
    
    const hashedOTP = hashOTP(otp);
    console.log('🔵 Hashed OTP:', hashedOTP);
    
    const otpExpiry = getOTPExpiry();
    console.log('🔵 About to call logOtpForDevelopment...');
    logOtpForDevelopment(payload.email, otp, 'register');
    console.log('🔵 logOtpForDevelopment called successfully');

    // If user exists but not verified, update their info
    if (existingUser && !existingUser.emailVerified) {
      await userRepository.update(existingUser._id.toString(), {
        fullName: payload.fullName,
        phone: payload.phone,
        password: hashedPassword,
        verificationCode: hashedOTP,
        verificationCodeExpiresAt: otpExpiry,
        onboardingStatus: 'registered',
      });

      // Send OTP email
      try {
        await sendVerificationEmail(payload.email, otp, fullName);
      } catch (err) {
        console.error('Error sending verification email (existing user update):', err);
      }

      return {
        message: 'Registration updated. Please verify your email.',
        email: maskEmail(payload.email),
        expiresIn: 600, // 10 minutes in seconds
      };
    }

    // Create new user
    const user = await userRepository.create({
      fullName,
      email: payload.email,
      phone: payload.phone,
      password: hashedPassword,
      role: 'company',
      tenantId: '',
      profileCompleted: false,
      isActive: true,
      emailVerified: false,
      verificationCode: hashedOTP,
      verificationCodeExpiresAt: otpExpiry,
      onboardingStatus: 'registered',
    });

    // Send OTP email
    try {
      await sendVerificationEmail(payload.email, otp, fullName);
    } catch (err) {
      console.error('Error sending verification email (new user):', err);
    }

    return {
      message: 'Registration successful. Please verify your email.',
      email: maskEmail(payload.email),
      expiresIn: 600,
    };
  },

  /**
   * Step 2: Verify email with OTP
   */
  verifyOTP: async (payload: VerifyOTPDto) => {
    // Find user by email
    const user = await userRepository.findByEmail(payload.email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new Error('No verification code found. Please request a new one.');
    }

    // Check if OTP expired
    if (isOTPExpired(user.verificationCodeExpiresAt)) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Compare OTP
    const isValid = compareOTP(payload.otp, user.verificationCode);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Update user - mark email as verified
    await userRepository.update(user._id.toString(), {
      emailVerified: true,
      verificationCode: undefined,
      verificationCodeExpiresAt: undefined,
      onboardingStatus: 'email_verified',
    });

    // Generate temporary registration token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organisationId: user.organisationId,
    });

    return {
      message: 'Email verified successfully',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        onboardingStatus: 'email_verified',
      },
      nextStep: 3,
    };
  },

  /**
   * Step 3: Add organisation details and create organisation
   */
  registerStep3: async (userId: string, payload: RegisterStep3Dto) => {
    // Find user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.emailVerified) {
      throw new Error('Please verify your email first');
    }

    const existingOrganisation =
      await organisationRepository.findByOwnerUserId(user._id.toString());

    const tenantId =
      existingOrganisation?.tenantId ||
      generateTenantIdFromName(payload.organisationName);

    const organisationPayload = {
      organisationName: payload.organisationName,
      industry: payload.industry,
      companySize: payload.teamSize as any,
      country: payload.country,
    };

    const organisation = existingOrganisation
      ? await organisationRepository.update(
        existingOrganisation._id.toString(),
        organisationPayload
      )
      : await organisationRepository.create({
        ...organisationPayload,
        ownerUserId: user._id.toString(),
        tenantId,
      });

    if (!organisation) {
      throw new Error('Unable to save organisation details');
    }

    // Update user with organisation details and change role to 'company'
    await userRepository.update(user._id.toString(), {
      tenantId,
      organisationId: organisation._id.toString(),
      role: 'company',
    });

    return {
      message: 'Organisation details saved successfully',
      organisation: {
        _id: organisation._id,
        organisationName: organisation.organisationName,
        industry: organisation.industry,
        teamSize: organisation.companySize,
        country: organisation.country,
      },
      nextStep: 4,
    };
  },

  /**
   * Step 4: Complete registration
   */
  completeRegistration: async (userId: string) => {
    // Find user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.organisationId) {
      throw new Error('Please add organisation details first');
    }

    const wasAlreadyCompleted = user.onboardingStatus === 'completed';

    // Update user - mark registration as completed
    const updatedUser = await userRepository.update(user._id.toString(), {
      onboardingStatus: 'completed',
      profileCompleted: true,
    });

    // Send welcome email
    if (!wasAlreadyCompleted) {
      await sendWelcomeEmail(user.email, user.fullName);
    }

    // Generate final token
    const token = generateToken({
      userId: updatedUser?._id,
      email: updatedUser?.email,
      role: updatedUser?.role,
      tenantId: updatedUser?.tenantId,
      organisationId: updatedUser?.organisationId,
    });

    return {
      message: 'Registration completed successfully',
      token,
      user: {
        _id: updatedUser?._id,
        fullName: updatedUser?.fullName,
        email: updatedUser?.email,
        role: updatedUser?.role,
        tenantId: updatedUser?.tenantId,
        organisationId: updatedUser?.organisationId,
        onboardingStatus: updatedUser?.onboardingStatus,
        profileCompleted: updatedUser?.profileCompleted,
      },
    };
  },

  /**
   * Resend OTP
   */
  resendOTP: async (email: string) => {
    // Find user
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const otpExpiry = getOTPExpiry();
    
    // Log OTP for development
    logOtpForDevelopment(email, otp, 'resend');

    // Update user with new OTP
    await userRepository.update(user._id.toString(), {
      verificationCode: hashedOTP,
      verificationCodeExpiresAt: otpExpiry,
    });

    // Send OTP email
    try {
      await sendVerificationEmail(email, otp, user.fullName);
    } catch (err) {
      console.error('Error sending verification email (resend):', err);
    }

    return {
      message: 'Verification code sent successfully',
      email: maskEmail(email),
      expiresIn: 600,
    };
  },

  acceptInvitation: async (payload: AcceptInvitationDto) => {
    const { token, fullName, password } = payload;

    if (!token) {
      throw new ApiError(400, 'Invitation token is required');
    }

    let decoded: any;

    try {
      decoded = verifyToken(token);
    } catch (error) {
      throw new ApiError(401, 'Invitation token is invalid or expired');
    }

    if (decoded?.purpose !== 'invitation') {
      throw new ApiError(400, 'Invalid invitation token');
    }

    const user = await userRepository.findById(decoded.userId as string);

    if (!user) {
      throw new ApiError(404, 'Invitation no longer valid');
    }

    if (user.accountStatus !== 'invited') {
      throw new ApiError(400, 'This invitation has already been used');
    }

    const hashedPassword = await hashPassword(password);

    // For employees, DO NOT set hasCompletedOnboarding to true
    // They must complete the onboarding questionnaire first
    const updateData: any = {
      fullName: fullName.trim(),
      password: hashedPassword,
      emailVerified: true,
      accountStatus: AccountStatus.JOINED,
      isActive: true,
    };

    // Only non-employees get automatic onboarding completion
    if (user.role !== 'employee') {
      updateData.onboardingStatus = 'completed';
      updateData.profileCompleted = true;
      updateData.hasCompletedOnboarding = true;
    } else {
      // Employees need to complete questionnaire
      updateData.hasCompletedOnboarding = false;
      updateData.profileCompleted = false;
    }

    const updatedUser = await userRepository.update(user._id.toString(), updateData);

    // Auto-assign onboarding questionnaires to employees
    if (user.role === 'employee' && (user.tenantId || user.organisationId)) {
      const tenantId = user.tenantId || user.organisationId;
      const orgId = user.organisationId || user.tenantId;
      const { assignOnboardingQuestionnaires } = require('./onboarding.service');
      try {
        await assignOnboardingQuestionnaires(
          user._id.toString(),
          tenantId,
          orgId,
          orgId
        );
      } catch (err) {
        console.error('Failed to assign onboarding questionnaires during acceptInvite:', err);
      }
    }

    const authToken = generateToken({
      userId: updatedUser?._id,
      email: updatedUser?.email,
      role: updatedUser?.role,
      tenantId: updatedUser?.tenantId,
      organisationId: updatedUser?.organisationId,
    });

    return {
      message: 'Invitation accepted successfully',
      token: authToken,
      user: {
        _id: updatedUser?._id,
        fullName: updatedUser?.fullName,
        email: updatedUser?.email,
        role: updatedUser?.role,
        tenantId: updatedUser?.tenantId,
        organisationId: updatedUser?.organisationId,
        hasCompletedOnboarding: updatedUser?.hasCompletedOnboarding,
      },
    };
  },

  /**
   * Login method
   */
  login: async (payload: LoginDto) => {
    const user = await userRepository.findByEmail(payload.email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login and change status from 'invited' to 'joined' on first login
    const updatePayload: any = {
      lastLoginAt: new Date(),
    };

    if (user.accountStatus === 'invited') {
      updatePayload.accountStatus = 'joined';
    }

    await userRepository.update(user._id.toString(), updatePayload);

    // Auto-assign onboarding questionnaires to employee on login if pending
    if (user.role === 'employee' && user.tenantId && !user.hasCompletedOnboarding) {
      const orgId = user.organisationId || user.tenantId;
      if (orgId) {
        try {
          const { assignOnboardingQuestionnaires } = require('./onboarding.service');
          await assignOnboardingQuestionnaires(
            user._id.toString(),
            user.tenantId,
            orgId,
            orgId
          );
        } catch (err) {
          console.error('Failed to assign onboarding questionnaires during login:', err);
        }
      }
    }

    await AdminDashboardService.createActivity(
      user._id.toString(),
      user.fullName,
      'Logged in successfully',
      'login',
      {
        tenantId: user.tenantId,
        organisationId: user.organisationId,
      }
    );

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organisationId: user.organisationId,
    });

    return {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },
};
