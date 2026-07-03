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

    return UserModel.find()
      .select("-password");

  },

  findById: async (id: string) => {

    return UserModel.findById(id)
      .select("-password");

  },

  update: async (
    id: string,
    payload: Partial<IUser>
  ) => {

    return UserModel.findByIdAndUpdate(
      id,
      payload,
      {
        new: true
      }
    ).select("-password");

  },

  delete: async (id: string) => {

    return UserModel.findByIdAndDelete(id);

  },

  findByEmail: async (email: string) => {
    return UserModel.findOne({ email });
  },
};