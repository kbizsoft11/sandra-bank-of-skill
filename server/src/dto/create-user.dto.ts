import { OnboardingStatus, UserRole } from "../types/common.types";

export interface CreateUserDto {

  firstName: string;

  lastName?: string;

  email: string;

  phone?: string;

  password: string;

  role: UserRole;

  tenantId?: string;

  profileCompleted?: boolean;

  isActive?: boolean;

  emailVerified?: boolean;

  verificationCode?: string;

  verificationCodeExpiresAt?: Date;

  onboardingStatus?: OnboardingStatus;

}
