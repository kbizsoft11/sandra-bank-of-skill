import { Router } from 'express';
import { systemSettingsController } from '../controllers/system-settings.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

/**
 * All system settings routes require admin authentication
 */

/**
 * GET /admin/system-settings
 * Get current system settings
 */
router.get('/', authenticate, allowRoles('admin'), systemSettingsController.getSettings);

/**
 * POST /admin/system-settings
 * Create new system settings (only if none exist)
 */
router.post('/', authenticate, allowRoles('admin'), systemSettingsController.createSettings);

/**
 * PUT /admin/system-settings
 * Update system settings (upsert)
 */
router.put('/', authenticate, allowRoles('admin'), systemSettingsController.updateSettings);

/**
 * PATCH /admin/system-settings/general
 * Update only general settings
 */
router.patch('/general', authenticate, allowRoles('admin'), systemSettingsController.updateGeneralSettings);

/**
 * PATCH /admin/system-settings/email
 * Update only email settings
 */
router.patch('/email', authenticate, allowRoles('admin'), systemSettingsController.updateEmailSettings);

/**
 * PATCH /admin/system-settings/security
 * Update only security settings
 */
router.patch('/security', authenticate, allowRoles('admin'), systemSettingsController.updateSecuritySettings);

/**
 * POST /admin/system-settings/reset
 * Reset all settings to defaults
 */
router.post('/reset', authenticate, allowRoles('admin'), systemSettingsController.resetSettings);

export default router;
