export type UserRole =
  | 'admin'
  | 'company'
  | 'employee';

export type SkillLevel =
  | 1
  | 2
  | 3
  | 4;

export type OnboardingStatus =
    | 'registered'
    | 'email_verified'
    | 'completed';


export type CompanySize =
    | '1-10'
    | '11-50'
    | '51-200'
    | '201-500'
    | '500+';