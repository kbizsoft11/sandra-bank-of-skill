// user.repository.ts

import { IUser } from '../types/user.types';
import { UserModel } from '../models/user.model';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserRole } from '../types/common.types';

export const userRepository = {
  create: async (payload: CreateUserDto & {
    role: UserRole;
    tenantId: string;
    profileCompleted: boolean;
    isActive: boolean;
  }) => {
    return UserModel.create(payload);
  },

  findAll: async () => {
    return UserModel.find();
  },

  findById: async (id: string) => {
    return UserModel.findById(id);
  },

  findByEmail: async (email: string) => {
    return UserModel.findOne({ email });
  },
};