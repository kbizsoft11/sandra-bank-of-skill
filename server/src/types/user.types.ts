import { UserRole, OnboardingStatus } from "./common.types";

export interface IUser {

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  password: string;

  role: UserRole;

  tenantId?: string;

  organisationId?: string;

  department?: string;

  location?: string;

  profileCompleted: boolean;

  emailVerified: boolean;

  verificationCode?: string;

  verificationCodeExpiresAt?: Date;

  onboardingStatus: OnboardingStatus;

  isActive: boolean;

}