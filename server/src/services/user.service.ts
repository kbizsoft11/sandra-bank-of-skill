// user.service.ts

import { CreateUserDto } from '../dto/create-user.dto';
import { userRepository } from '../repositories/user.repository';

export const userService = {
  getAllUsers: async () => {
    return await userRepository.findAll();
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

    return userRepository.create({
      ...payload,
      role: 'employee',
      tenantId: 'company-1',
      profileCompleted: false,
      isActive: true,
    });
  }
};

