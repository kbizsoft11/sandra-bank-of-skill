import { UserRole, OnboardingStatus, AccountStatus } from "./common.types";
import { IPrismAssessment } from "./assessment.types";

export interface IUser {

  fullName: string;

  email: string;

  phone?: string;

  password: string;

  role: UserRole;

  tenantId?: string;

  organisationId?: string;

  designationId?: string;

  team?: string;

  department?: string;

  location?: string;

  profileCompleted: boolean;

  hasCompletedOnboarding: boolean;

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

  // PRISM Brain Mapping Assessment
  prismAssessment?: IPrismAssessment;

}