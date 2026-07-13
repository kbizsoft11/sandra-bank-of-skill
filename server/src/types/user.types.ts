import { UserRole, OnboardingStatus, AccountStatus } from "./common.types";

export interface IUser {

  fullName: string;

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

  accountStatus?: AccountStatus;

  invitedAt?: Date;

  lastLoginAt?: Date;

  profileImage?: string;

  title?: string;

  bio?: string;

  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };

}