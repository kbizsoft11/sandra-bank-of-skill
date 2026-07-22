export interface CreateSystemSettingsDTO {
  platformName?: string;
  logo?: string;
  favicon?: string;
  supportEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
  jwtExpiry?: string;
  passwordPolicy?: PasswordPolicyDTO;
  sessionTimeout?: number;
}

export interface UpdateSystemSettingsDTO {
  platformName?: string;
  logo?: string;
  favicon?: string;
  supportEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
  jwtExpiry?: string;
  passwordPolicy?: PasswordPolicyDTO;
  sessionTimeout?: number;
}

export interface UpdateGeneralSettingsDTO {
  platformName?: string;
  logo?: string;
  favicon?: string;
  supportEmail?: string;
}

export interface UpdateEmailSettingsDTO {
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
}

export interface UpdateSecuritySettingsDTO {
  jwtExpiry?: string;
  passwordPolicy?: PasswordPolicyDTO;
  sessionTimeout?: number;
}

export interface PasswordPolicyDTO {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export interface SystemSettingsResponseDTO {
  _id?: string;
  platformName?: string;
  logo?: string;
  favicon?: string;
  supportEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  fromEmail?: string;
  jwtExpiry?: string;
  passwordPolicy?: PasswordPolicyDTO;
  sessionTimeout?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
