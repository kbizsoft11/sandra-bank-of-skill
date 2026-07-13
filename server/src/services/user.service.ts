// user.service.ts

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

import { userRepository } from '../repositories/user.repository';

import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendInvitationEmail, sendPasswordResetNotificationEmail } from './email.service';
import { deleteOldProfileImage } from '../utils/file-upload';
import path from 'path';
import { AccountStatus } from '../types/common.types';
import { v4 as uuidv4 } from 'uuid';

export const userService = {

  getAllUsers: async (userRole?: string, userTenantId?: string) => {

    // Admin sees only companies (not employees or other admins)
    if (userRole === 'admin') {
      return await userRepository.findAll('company');
    } 
    // Company sees only their employees with same tenantId
    else if (userRole === 'company') {
      return await userRepository.findAll('employee', userTenantId);
    }
    
    // Default: return empty array for other roles
    return [];

  },

  getEmployeesByCompany: async (companyId: string) => {
    // Get company user to find tenantId
    const company = await userRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    if (company.role !== 'company') {
      throw new Error('User is not a company');
    }

    // Get all employees with the same tenantId
    return await userRepository.findAll('employee', company.tenantId);
  },

  getUserById: async (id: string) => {

    const user =
      await userRepository.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    return user;

  },

  createUser: async (
    payload: CreateUserDto,
    createdByUserId?: string,
    createdByName?: string
  ) => {
    const existingUser =
      await userRepository.findByEmail(
        payload.email
      );

    if (existingUser) {
      throw new Error(
        'User already exists'
      );
    }

    // Only admin can create company users
    if (payload.role !== 'company') {
      throw new Error(
        'Only company users can be created. Employees must be invited by their company administrator.'
      );
    }

    // Generate random password for company user
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Generate unique tenantId for the company
    const tenantId = uuidv4();

    // Fetch admin name if not provided
    let adminName = createdByName;
    if (!adminName && createdByUserId) {
      const admin = await userRepository.findById(createdByUserId);
      adminName = admin?.fullName || 'Administrator';
    }
    adminName = adminName || 'Administrator';

    // Create the company user
    const newUser = await userRepository.create({
      fullName: payload.fullName,
      email: payload.email,
      password: hashedPassword,
      role: 'company',
      tenantId: tenantId,
      profileCompleted: false,
      isActive: true,
      emailVerified: false,
      accountStatus: AccountStatus.INVITED,
      invitedAt: new Date(),
    });

    // Send invitation email with generated password
    await sendInvitationEmail(
      payload.email,
      generatedPassword,
      payload.fullName,
      adminName
    );

    return newUser;

  },

  updateUser: async (
    id: string,
    payload: UpdateUserDto
  ) => {

    const existingUser =
      await userRepository.findById(id);

    if (!existingUser) {
      throw new Error(
        'User not found'
      );
    }

    if (payload.email) {

      const emailExists =
        await userRepository.findByEmail(
          payload.email
        );

      if (
        emailExists &&
        emailExists._id.toString() !== id
      ) {

        throw new Error(
          'Email already exists'
        );

      }

    }

    return await userRepository.update(
      id,
      payload
    );

  },

  deleteUser: async (
    id: string
  ) => {

    const existingUser =
      await userRepository.findById(id);

    if (!existingUser) {

      throw new Error(
        'User not found'
      );

    }

    await userRepository.delete(id);

    return;

  },

  /**
   * Invite a new user with auto-generated password
   */
  inviteUser: async (
    payload: InviteUserDto,
    invitedByUserId: string,
    invitedByName: string
  ) => {

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Get the inviter's details to inherit tenantId and organisationId
    const inviter = await userRepository.findById(invitedByUserId);

    if (!inviter) {
      throw new Error('Inviter user not found');
    }

    if (inviter.role !== 'company') {
      throw new Error('Only company users can invite employees');
    }

    if (!inviter.tenantId || !inviter.organisationId) {
      throw new Error('Company user must have tenantId and organisationId to invite employees');
    }

    // Generate random secure password
    const generatedPassword = generateRandomPassword();

    // Hash the password
    const hashedPassword = await hashPassword(generatedPassword);

    // Extract full name or use email prefix as fallback
    const fullName = payload.fullName || payload.email.split('@')[0];

    // Create the user with company's tenantId and organisationId
    const newUser = await userRepository.create({
      fullName: fullName,
      email: payload.email,
      password: hashedPassword,
      role: payload.role || 'employee',
      tenantId: inviter.tenantId,
      organisationId: inviter.organisationId,
      profileCompleted: false,
      isActive: true,
      emailVerified: true, // Auto-verify invited users
      onboardingStatus: 'completed', // Skip onboarding for invited users
      accountStatus: AccountStatus.INVITED,
      invitedAt: new Date(), 
    });

    // Send invitation email with generated password
    await sendInvitationEmail(
      payload.email,
      generatedPassword,
      fullName,
      invitedByName
    );

    return {
      user: newUser,
      message: 'Invitation sent successfully',
    };

  },

  /**
   * Reset user password and send notification email
   */
  resetUserPassword: async (
    userId: string,
    resetByName: string
  ) => {

    // Find the user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new random password
    const newPassword = generateRandomPassword();

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await userRepository.update(userId, {
      password: hashedPassword,
    });

    // Send password reset notification email
    await sendPasswordResetNotificationEmail(
      user.email,
      newPassword,
      user.fullName,
      resetByName
    );

    return {
      message: 'Password reset successfully and email sent',
    };

  },

  /**
   * Get current user profile
   */
  getMyProfile: async (userId: string) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Update current user profile
   */
  updateMyProfile: async (
    userId: string,
    payload: UpdateProfileDto
  ) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await userRepository.update(userId, payload);

    return updatedUser;
  },

  /**
   * Update user profile picture
   */
  updateProfilePicture: async (
    userId: string,
    filename: string
  ) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      // Delete the uploaded file since user doesn't exist
      const uploadedFilePath = path.join(__dirname, '../../uploads/profiles', filename);
      deleteOldProfileImage(uploadedFilePath);
      throw new Error('User not found');
    }

    // Store old image path for cleanup
    const oldImagePath = user.profileImage 
      ? path.join(__dirname, '../../uploads/profiles', path.basename(user.profileImage))
      : null;

    // Update profile image in database
    const profileImageUrl = `/uploads/profiles/${filename}`;
    
    try {
      const updatedUser = await userRepository.update(userId, {
        profileImage: profileImageUrl,
      });

      // Delete old profile image only after successful database update
      if (oldImagePath) {
        deleteOldProfileImage(oldImagePath);
      }

      return updatedUser;
    } catch (error) {
      // If database update fails, delete the newly uploaded file
      const uploadedFilePath = path.join(__dirname, '../../uploads/profiles', filename);
      deleteOldProfileImage(uploadedFilePath);
      throw error;
    }
  }

};