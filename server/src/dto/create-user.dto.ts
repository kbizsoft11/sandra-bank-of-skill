import { UserRole } from "../types/common.types";

export interface CreateUserDto {

  firstName: string;

  lastName?: string;

  email: string;

  password: string;

  role: UserRole;

  tenantId?: string;

  profileCompleted?: boolean;

  isActive?: boolean;

}