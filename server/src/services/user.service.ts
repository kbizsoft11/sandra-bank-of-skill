// user.service.ts

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { InviteUserDto } from '../dto/invite-user.dto';

import { userRepository } from '../repositories/user.repository';

import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendInvitationEmail, sendPasswordResetNotificationEmail } from './email.service';

export const userService = {

  getAllUsers: async () => {

    return await userRepository.findAll();

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
    payload: CreateUserDto
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

    const hashedPassword =
      await hashPassword(
        payload.password
      );

    return await userRepository.create({
      fullName: payload.fullName,
      email: payload.email,
      password: hashedPassword,
      role: payload.role,
      tenantId: payload.tenantId || 'company-1',
      profileCompleted: payload.profileCompleted || false,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    });

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
    invitedByName: string
  ) => {

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate random secure password
    const generatedPassword = generateRandomPassword();

    // Hash the password
    const hashedPassword = await hashPassword(generatedPassword);

    // Extract full name or use email prefix as fallback
    const fullName = payload.fullName || payload.email.split('@')[0];

    // Create the user
    const newUser = await userRepository.create({
      fullName: fullName,
      email: payload.email,
      password: hashedPassword,
      role: payload.role || 'employee',
      tenantId: 'company-1',
      profileCompleted: false,
      isActive: true,
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

  }

};