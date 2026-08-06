import { ISystemSettings } from '../models/system-settings.model';
import { systemSettingsRepository } from '../repositories/system-settings.repository';

interface CachedSettings {
  data: ISystemSettings | null;
  lastUpdated: Date;
}

/**
 * Settings Cache Service
 * Maintains an in-memory cache of system settings
 * Provides methods to get, update, and refresh the cache
 */
class SettingsCacheService {
  private cache: CachedSettings = {
    data: null,
    lastUpdated: new Date(0), // Epoch, so first load will refresh
  };

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the cache on application startup
   */
  async initialize(): Promise<void> {
    try {
      console.log('📦 Initializing settings cache...');
      const settings = await systemSettingsRepository.getSettings();
      this.cache = {
        data: settings,
        lastUpdated: new Date(),
      };
      console.log('✅ Settings cache initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing settings cache:', error);
      // Don't throw - app should still start even if settings cache fails
      this.cache = {
        data: null,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get cached settings
   * Returns cached data if valid, otherwise refreshes from DB
   */
  async get(): Promise<ISystemSettings | null> {
    // Check if cache is still valid
    if (this.isCacheValid()) {
      return this.cache.data;
    }

    // Cache expired, refresh it
    return this.refresh();
  }

  /**
   * Get settings synchronously (from cache only, no DB call)
   * Useful for immediate operations that don't require latest data
   */
  getSync(): ISystemSettings | null {
    return this.cache.data;
  }

  /**
   * Refresh cache from database
   */
  async refresh(): Promise<ISystemSettings | null> {
    try {
      const settings = await systemSettingsRepository.getSettings();
      this.cache = {
        data: settings,
        lastUpdated: new Date(),
      };
      return settings;
    } catch (error) {
      console.error('❌ Error refreshing settings cache:', error);
      // Return cached data even if refresh fails
      return this.cache.data;
    }
  }

  /**
   * Invalidate cache immediately
   * Forces refresh on next get() call
   */
  invalidate(): void {
    this.cache.lastUpdated = new Date(0);
    console.log('🔄 Settings cache invalidated');
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.cache.lastUpdated.getTime();
    return timeSinceUpdate < this.CACHE_TTL_MS;
  }
}

export const settingsCacheService = new SettingsCacheService();
