import { systemSettingsRepository } from '../repositories/system-settings.repository';
import { ISystemSettings } from '../models/system-settings.model';
import activityService from './activity.service';
import { settingsCacheService } from './settings-cache.service';
import { reinitializeEmailTransporter } from './email.service';
import { ACTIVITY_TYPES, RESOURCE_TYPES } from '../constants/activity-types';

export const systemSettingsService = {
  /**
   * Get current system settings
   * Returns default settings structure if none exist
   */
  getSettings: async (): Promise<ISystemSettings | null> => {
    try {
      const settings = await settingsCacheService.get();
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
      
      // Invalidate cache and reinitialize services
      settingsCacheService.invalidate();
      reinitializeEmailTransporter();
      
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
      
      // Invalidate cache and reinitialize services
      settingsCacheService.invalidate();
      reinitializeEmailTransporter();
      
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
    favicon?: string;
    supportEmail?: string;
  }, userId?: string, userName?: string, userEmail?: string, ipAddress?: string, userAgent?: string): Promise<ISystemSettings> => {
    try {
      validateEmail(data.supportEmail);

      const settings = await systemSettingsRepository.upsertSettings({
        platformName: data.platformName,
        favicon: data.favicon,
        supportEmail: data.supportEmail,
      });

      // Invalidate cache and reinitialize services
      settingsCacheService.invalidate();
      reinitializeEmailTransporter();

      // Log activity
      if (userId) {
        try {
          await activityService.logActivity({
            userId,
            userName: userName || 'Unknown',
            userEmail: userEmail || '',
            userRole: 'admin',
            actionType: ACTIVITY_TYPES.UPDATE,
            resource: RESOURCE_TYPES.SYSTEM_SETTINGS,
            description: 'General system settings updated',
            status: 'success',
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            details: { updatedFields: Object.keys(data) },
          });
        } catch (err) {
          console.error('Error logging system settings update activity:', err);
        }
      }

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
    smtpEncryption?: 'tls' | 'ssl';
    fromEmail?: string;
  }, userId?: string, userName?: string, userEmail?: string, ipAddress?: string, userAgent?: string): Promise<ISystemSettings> => {
    try {
      validateSmtpSettings(data);
      validateEmail(data.fromEmail);

      // Only include password in update if it was explicitly provided
      const updateData: any = {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername,
        smtpEncryption: data.smtpEncryption,
        fromEmail: data.fromEmail,
      };

      // Only update password if it was explicitly provided in the request
      if (data.smtpPassword !== undefined && data.smtpPassword !== null) {
        updateData.smtpPassword = data.smtpPassword;
      }

      const settings = await systemSettingsRepository.upsertSettings(updateData);

      // Invalidate cache and reinitialize transporter immediately
      settingsCacheService.invalidate();
      reinitializeEmailTransporter();

      // Log activity
      if (userId) {
        try {
          const updatedFields = Object.keys(data).filter(k => 
            k !== 'smtpPassword' || (data.smtpPassword !== undefined && data.smtpPassword !== null)
          );
          
          await activityService.logActivity({
            userId,
            userName: userName || 'Unknown',
            userEmail: userEmail || '',
            userRole: 'admin',
            actionType: ACTIVITY_TYPES.UPDATE,
            resource: RESOURCE_TYPES.SYSTEM_SETTINGS,
            description: 'Email system settings updated (SMTP configuration changed)',
            status: 'success',
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            details: { updatedFields },
          });
        } catch (err) {
          console.error('Error logging email settings update activity:', err);
        }
      }

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

      // Invalidate cache
      settingsCacheService.invalidate();

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
      
      // Invalidate cache and reinitialize services
      settingsCacheService.invalidate();
      reinitializeEmailTransporter();
      
      return defaultSettings;
    } catch (error) {
      console.error('Error in systemSettingsService.resetSettings:', error);
      throw error;
    }
  },

  /**
   * Send a test email to verify SMTP configuration
   */
  sendTestEmail: async (toEmail: string, recipientName: string): Promise<{ success: boolean; messageId?: string }> => {
    try {
      console.log('\n🧪 SENDING TEST EMAIL');
      console.log('To:', toEmail);
      console.log('Recipient Name:', recipientName);
      
      const { sendEmail } = await import('./email.service');
      
      // Generate a random OTP for testing
      const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
      
      const subject = 'Test Email - Bank of Skill SMTP Configuration';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10B981; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .success-box { background: #D1FAE5; padding: 20px; border-left: 4px solid #10B981; border-radius: 6px; margin: 20px 0; }
                .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px solid #10B981; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10B981; font-family: monospace; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Bank of Skill</h1>
                </div>
                <div class="content">
                    <div class="success-box">
                        <h2 style="margin-top: 0; color: #10B981;">SMTP Configuration Test Successful!</h2>
                        <p>This test email confirms that your SMTP configuration is working correctly.</p>
                    </div>
                    
                    <h2>Hello ${recipientName},</h2>
                    <p>Your email system is configured and operational.</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0;"><strong>Test Reference Code:</strong></p>
                        <div class="otp-code">${testOTP}</div>
                    </div>
                    
                    <p><strong>Test Details:</strong></p>
                    <ul>
                        <li>Sent at: ${new Date().toLocaleString()}</li>
                        <li>System: Bank of Skill</li>
                    </ul>
                    
                    <p>If you have any questions about your email settings, please contact support.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Bank of Skill. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `;
      
      const text = `
        SMTP Configuration Test Successful!
        
        This test email confirms that your SMTP configuration is working correctly.
        
        Hello ${recipientName},
        
        Your email system is configured and operational.
        
        Test Reference Code: ${testOTP}
        
        Sent at: ${new Date().toLocaleString()}
        System: Bank of Skill
      `;
      
      // Send test email
      await sendEmail({ to: toEmail, subject, html, text });
      
      console.log('✅ Test email sent successfully to:', toEmail);
      
      return {
        success: true,
        messageId: 'test-' + Date.now(),
      };
    } catch (error) {
      console.error('❌ Error sending test email:', error);
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
