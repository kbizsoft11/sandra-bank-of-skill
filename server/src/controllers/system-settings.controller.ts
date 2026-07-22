import { Request, Response } from 'express';
import { systemSettingsService } from '../services/system-settings.service';
import {
  UpdateSystemSettingsDTO,
  UpdateGeneralSettingsDTO,
  UpdateEmailSettingsDTO,
  UpdateSecuritySettingsDTO,
} from '../dto/system-settings.dto';

export const systemSettingsController = {
  /**
   * GET /admin/system-settings
   * Get current system settings
   */
  getSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await systemSettingsService.getSettings();

      res.json({
        success: true,
        data: settings,
        message: 'System settings retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getSettings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system settings',
      });
    }
  },

  /**
   * POST /admin/system-settings
   * Create system settings (only if none exist)
   */
  createSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateSystemSettingsDTO = req.body;

      const settings = await systemSettingsService.createSettings(data);

      res.status(201).json({
        success: true,
        data: settings,
        message: 'System settings created successfully',
      });
    } catch (error: any) {
      console.error('Error in createSettings:', error);
      const statusCode = error.message?.includes('already exist') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to create system settings',
      });
    }
  },

  /**
   * PUT /admin/system-settings
   * Update system settings (upsert)
   */
  updateSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateSystemSettingsDTO = req.body;

      const settings = await systemSettingsService.updateSettings(data);

      res.json({
        success: true,
        data: settings,
        message: 'System settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error in updateSettings:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update system settings',
      });
    }
  },

  /**
   * PATCH /admin/system-settings/general
   * Update only general settings
   */
  updateGeneralSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateGeneralSettingsDTO = req.body;

      const settings = await systemSettingsService.updateGeneralSettings(data);

      res.json({
        success: true,
        data: settings,
        message: 'General settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error in updateGeneralSettings:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update general settings',
      });
    }
  },

  /**
   * PATCH /admin/system-settings/email
   * Update only email settings
   */
  updateEmailSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateEmailSettingsDTO = req.body;

      const settings = await systemSettingsService.updateEmailSettings(data);

      res.json({
        success: true,
        data: settings,
        message: 'Email settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error in updateEmailSettings:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update email settings',
      });
    }
  },

  /**
   * PATCH /admin/system-settings/security
   * Update only security settings
   */
  updateSecuritySettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateSecuritySettingsDTO = req.body;

      const settings = await systemSettingsService.updateSecuritySettings(data);

      res.json({
        success: true,
        data: settings,
        message: 'Security settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error in updateSecuritySettings:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update security settings',
      });
    }
  },

  /**
   * POST /admin/system-settings/reset
   * Reset all settings to defaults
   */
  resetSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await systemSettingsService.resetSettings();

      res.json({
        success: true,
        data: settings,
        message: 'System settings reset to defaults',
      });
    } catch (error: any) {
      console.error('Error in resetSettings:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reset system settings',
      });
    }
  },
};
