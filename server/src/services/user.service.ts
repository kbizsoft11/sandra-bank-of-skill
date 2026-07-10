// user.service.ts

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

import { userRepository } from '../repositories/user.repository';

import { hashPassword } from '../utils/password';

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

  }

};