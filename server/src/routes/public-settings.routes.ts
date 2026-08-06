import { Router, Request, Response } from 'express';
import { systemSettingsService } from '../services/system-settings.service';

const router = Router();

/**
 * GET /api/public/settings
 * Get public system settings (no authentication required)
 * Returns: platformName, logo, favicon, supportEmail
 * Excludes: SMTP config, security settings, etc.
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettingsPublic();

    res.json({
      success: true,
      data: settings,
      message: 'Public settings retrieved successfully',
    });
  } catch (error) {
    console.error('Error in public settings endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings',
    });
  }
});

/**
 * GET /api/public/favicon
 * Get favicon as data URL or redirect
 */
router.get('/favicon', async (req: Request, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettingsPublic();

    if (settings?.favicon) {
      // Favicon is stored as base64 or URL
      if (settings.favicon.startsWith('data:')) {
        // It's a data URL, serve it directly
        const [header, data] = settings.favicon.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/x-icon';
        const buffer = Buffer.from(data, 'base64');
        res.type(mimeType);
        res.send(buffer);
      } else if (settings.favicon.startsWith('http')) {
        // It's a URL, redirect to it
        res.redirect(settings.favicon);
      } else {
        // Assume it's base64
        const buffer = Buffer.from(settings.favicon, 'base64');
        res.type('image/x-icon');
        res.send(buffer);
      }
    } else {
      // No favicon configured, return 404
      res.status(404).json({
        success: false,
        error: 'No favicon configured',
      });
    }
  } catch (error) {
    console.error('Error serving favicon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve favicon',
    });
  }
});

export default router;
