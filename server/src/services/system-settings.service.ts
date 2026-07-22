import { systemSettingsRepository } from '../repositories/system-settings.repository';
import { ISystemSettings } from '../models/system-settings.model';

export const systemSettingsService = {
  /**
   * Get current system settings
   * Returns default settings structure if none exist
   */
  getSettings: async (): Promise<ISystemSettings | null> => {
    try {
      const settings = await systemSettingsRepository.getSettings();
      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.getSettings:', error);
      throw error;
    }
  },

  /**
   * Get settings without sensitive data (for frontend)
   */
  getSettingsPublic: async (): Promise<any> => {
    try {
      const settings = await systemSettingsRepository.getSettingsPublic();
      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.getSettingsPublic:', error);
      throw error;
    }
  },

  /**
   * Create new system settings
   * Only succeeds if no settings exist
   */
  createSettings: async (data: Partial<ISystemSettings>): Promise<ISystemSettings> => {
    try {
      // Validate data
      validateSettingsData(data);

      const settings = await systemSettingsRepository.createSettings(data);
      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.createSettings:', error);
      throw error;
    }
  },

  /**
   * Update existing system settings
   * Creates settings if none exist
   */
  updateSettings: async (data: Partial<ISystemSettings>): Promise<ISystemSettings> => {
    try {
      // Validate data
      validateSettingsData(data);

      const settings = await systemSettingsRepository.upsertSettings(data);
      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.updateSettings:', error);
      throw error;
    }
  },

  /**
   * Update general settings
   */
  updateGeneralSettings: async (data: {
    platformName?: string;
    logo?: string;
    favicon?: string;
    supportEmail?: string;
  }): Promise<ISystemSettings> => {
    try {
      validateEmail(data.supportEmail);

      const settings = await systemSettingsRepository.upsertSettings({
        platformName: data.platformName,
        logo: data.logo,
        favicon: data.favicon,
        supportEmail: data.supportEmail,
      });

      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.updateGeneralSettings:', error);
      throw error;
    }
  },

  /**
   * Update email settings
   */
  updateEmailSettings: async (data: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    fromEmail?: string;
  }): Promise<ISystemSettings> => {
    try {
      validateSmtpSettings(data);
      validateEmail(data.fromEmail);

      const settings = await systemSettingsRepository.upsertSettings({
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername,
        smtpPassword: data.smtpPassword,
        fromEmail: data.fromEmail,
      });

      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.updateEmailSettings:', error);
      throw error;
    }
  },

  /**
   * Update security settings
   */
  updateSecuritySettings: async (data: {
    jwtExpiry?: string;
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
    };
    sessionTimeout?: number;
  }): Promise<ISystemSettings> => {
    try {
      validateSecuritySettings(data);

      const settings = await systemSettingsRepository.upsertSettings({
        jwtExpiry: data.jwtExpiry,
        passwordPolicy: data.passwordPolicy,
        sessionTimeout: data.sessionTimeout,
      });

      return settings;
    } catch (error) {
      console.error('Error in systemSettingsService.updateSecuritySettings:', error);
      throw error;
    }
  },

  /**
   * Reset all settings to defaults
   */
  resetSettings: async (): Promise<ISystemSettings> => {
    try {
      await systemSettingsRepository.deleteSettings();
      const defaultSettings = await systemSettingsRepository.createSettings({});
      return defaultSettings;
    } catch (error) {
      console.error('Error in systemSettingsService.resetSettings:', error);
      throw error;
    }
  },
};

/**
 * Validation helpers
 */
function validateSettingsData(data: any): void {
  if (data.supportEmail) validateEmail(data.supportEmail);
  if (data.fromEmail) validateEmail(data.fromEmail);
  if (data.smtpPort) validateSmtpPort(data.smtpPort);
  if (data.sessionTimeout) validateSessionTimeout(data.sessionTimeout);
  if (data.passwordPolicy) validatePasswordPolicy(data.passwordPolicy);
}

function validateEmail(email?: string): void {
  if (!email) return;
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }
}

function validateSmtpSettings(data: any): void {
  if (data.smtpPort) {
    validateSmtpPort(data.smtpPort);
  }
  if (data.smtpHost && typeof data.smtpHost !== 'string') {
    throw new Error('SMTP Host must be a string');
  }
  if (data.smtpUsername && typeof data.smtpUsername !== 'string') {
    throw new Error('SMTP Username must be a string');
  }
  if (data.smtpPassword && typeof data.smtpPassword !== 'string') {
    throw new Error('SMTP Password must be a string');
  }
}

function validateSmtpPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP Port must be a number between 1 and 65535');
  }
}

function validateSecuritySettings(data: any): void {
  if (data.jwtExpiry) {
    const validExpiryValues = ['1d', '3d', '7d', '14d', '30d'];
    if (!validExpiryValues.includes(data.jwtExpiry)) {
      throw new Error(`JWT Expiry must be one of: ${validExpiryValues.join(', ')}`);
    }
  }

  if (data.sessionTimeout) {
    validateSessionTimeout(data.sessionTimeout);
  }

  if (data.passwordPolicy) {
    validatePasswordPolicy(data.passwordPolicy);
  }
}

function validateSessionTimeout(timeout: number): void {
  if (!Number.isInteger(timeout) || timeout < 5 || timeout > 1440) {
    throw new Error('Session Timeout must be a number between 5 and 1440 minutes');
  }
}

function validatePasswordPolicy(policy: any): void {
  if (policy.minLength !== undefined) {
    if (!Number.isInteger(policy.minLength) || policy.minLength < 6 || policy.minLength > 32) {
      throw new Error('Password minimum length must be between 6 and 32');
    }
  }

  if (policy.requireUppercase !== undefined && typeof policy.requireUppercase !== 'boolean') {
    throw new Error('requireUppercase must be a boolean');
  }

  if (policy.requireLowercase !== undefined && typeof policy.requireLowercase !== 'boolean') {
    throw new Error('requireLowercase must be a boolean');
  }

  if (policy.requireNumbers !== undefined && typeof policy.requireNumbers !== 'boolean') {
    throw new Error('requireNumbers must be a boolean');
  }

  if (policy.requireSpecialChars !== undefined && typeof policy.requireSpecialChars !== 'boolean') {
    throw new Error('requireSpecialChars must be a boolean');
  }
}
