import { AccountStatus, OnboardingStatus, UserRole } from "../types/common.types";

export interface CreateUserDto {

  fullName: string;

  email: string;

  phone?: string;

  password: string;

  role: UserRole;

  tenantId?: string;

  organisationId?: string;

  profileCompleted?: boolean;

  hasCompletedOnboarding?: boolean;

  isActive?: boolean;

  emailVerified?: boolean;

  verificationCode?: string;

  verificationCodeExpiresAt?: Date;

  onboardingStatus?: OnboardingStatus;

  accountStatus?: AccountStatus;  
  invitedAt?: Date;   

}
