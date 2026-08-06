import { Injectable, inject, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { tap, catchError, startWith } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export interface PublicSettings {
  _id?: string;
  platformName?: string;
  favicon?: string;
  supportEmail?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class PublicSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.SERVER_URL}/api/public`;

  // Signal to store current settings
  private settingsSignal = signal<PublicSettings | null>(null);
  settings$ = this.settingsSignal.asReadonly();

  // Signal to track if settings have been loaded
  private loadedSignal = signal(false);
  loaded$ = this.loadedSignal.asReadonly();

  constructor() {
    // Load settings on service creation
    this.loadSettings();

    // Create effect to apply settings to the UI
    effect(() => {
      const settings = this.settingsSignal();
      if (settings) {
        this.applySettings(settings);
      }
    });

    // Poll for settings updates every 5 minutes
    this.startPolling();
  }

  /**
   * Load settings from the server
   */
  loadSettings(): void {
    this.getSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.settingsSignal.set(response.data);
          this.loadedSignal.set(true);
        }
      },
      error: (error) => {
        console.warn('Failed to load public settings:', error);
        this.loadedSignal.set(true);
      },
    });
  }

  /**
   * Get public settings from the server
   */
  getSettings(): Observable<{ success: boolean; data?: PublicSettings; message?: string; error?: string }> {
    return this.http.get<{ success: boolean; data?: PublicSettings; message?: string; error?: string }>(
      `${this.apiUrl}/settings`
    );
  }

  /**
   * Refresh settings (useful after settings are updated)
   */
  refreshSettings(): void {
    this.loadSettings();
  }

  /**
   * Start polling for settings updates
   */
  private startPolling(): void {
    // Poll every 5 minutes
    interval(5 * 60 * 1000)
      .pipe(
        startWith(0),
        // Skip initial 0, don't poll at startup
        // since we already load on construction
      )
      .subscribe(() => {
        this.refreshSettings();
      });
  }

  /**
   * Apply settings to the UI
   */
  private applySettings(settings: PublicSettings): void {
    // Update page title with platform name
    if (settings.platformName) {
      document.title = settings.platformName + ' - Bank of Skill';
    }

    // Update favicon
    if (settings.favicon) {
      this.updateFavicon(settings.favicon);
    }

    // Update platform name in header/navigation if needed
    if (settings.platformName) {
      this.updatePlatformName(settings.platformName);
    }

    // You can add more UI updates here based on settings
  }

  /**
   * Update the page favicon
   */
  private updateFavicon(faviconData: string): void {
    // Find existing favicon link
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

    if (!link) {
      // Create new favicon link if it doesn't exist
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Update favicon
    if (faviconData.startsWith('data:')) {
      // It's a data URL
      link.href = faviconData;
    } else if (faviconData.startsWith('http')) {
      // It's a URL
      link.href = faviconData;
    } else {
      // Assume it needs to be served from the API
      link.href = `${this.apiUrl}/favicon`;
    }
  }

  /**
   * Update platform name in the UI
   * This can be overridden or extended in child components
   */
  private updatePlatformName(platformName: string): void {
    // You can emit this to a service that your layout component listens to
    // For now, just log it
    console.log('Platform name:', platformName);
  }

  /**
   * Get settings synchronously (if already loaded)
   */
  getSettingsSync(): PublicSettings | null {
    return this.settingsSignal();
  }

  /**
   * Get platform name synchronously
   */
  getPlatformNameSync(): string {
    return this.settingsSignal()?.platformName || 'Bank of Skill';
  }

  /**
   * Get support email synchronously
   */
  getSupportEmailSync(): string | undefined {
    return this.settingsSignal()?.supportEmail;
  }
}
