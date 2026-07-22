import { SystemSettings, ISystemSettings } from '../models/system-settings.model';

export const systemSettingsRepository = {
  /**
   * Get the system settings document
   * Returns null if no settings exist
   */
  getSettings: async (): Promise<ISystemSettings | null> => {
    try {
      const settings = await SystemSettings.findOne().select('+smtpPassword').lean();
      return settings;
    } catch (error) {
      console.error('Error getting system settings:', error);
      throw error;
    }
  },

  /**
   * Create new system settings
   * Throws error if settings already exist
   */
  createSettings: async (data: Partial<ISystemSettings>): Promise<ISystemSettings> => {
    try {
      // Check if settings already exist
      const existing = await SystemSettings.findOne();
      if (existing) {
        throw new Error('System settings already exist. Use update instead.');
      }

      const settings = new SystemSettings(data);
      await settings.save();
      return settings.toObject();
    } catch (error) {
      console.error('Error creating system settings:', error);
      throw error;
    }
  },

  /**
   * Update system settings
   * Creates new settings if none exist, otherwise updates existing
   */
  updateSettings: async (data: Partial<ISystemSettings>): Promise<ISystemSettings> => {
    try {
      let settings = await SystemSettings.findOne();

      if (!settings) {
        // Create new settings if none exist
        settings = new SystemSettings(data);
      } else {
        // Update existing settings
        Object.assign(settings, data);
      }

      await settings.save();
      return settings.toObject();
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  },

  /**
   * Upsert system settings (update or insert)
   * Ensures only one document exists
   */
  upsertSettings: async (data: Partial<ISystemSettings>): Promise<ISystemSettings> => {
    try {
      const settings = await SystemSettings.findOneAndUpdate({}, data, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }).select('+smtpPassword');

      return settings!.toObject();
    } catch (error) {
      console.error('Error upserting system settings:', error);
      throw error;
    }
  },

  /**
   * Delete all system settings
   * Use with caution - resets all settings to defaults
   */
  deleteSettings: async (): Promise<boolean> => {
    try {
      const result = await SystemSettings.deleteMany({});
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting system settings:', error);
      throw error;
    }
  },

  /**
   * Get settings without sensitive data (for frontend)
   */
  getSettingsPublic: async (): Promise<any> => {
    try {
      const settings = await SystemSettings.findOne();
      if (!settings) {
        return null;
      }

      const settingsObj = settings.toObject();
      // Remove sensitive fields
      delete (settingsObj as any).smtpPassword;

      return settingsObj;
    } catch (error) {
      console.error('Error getting public system settings:', error);
      throw error;
    }
  },
};
