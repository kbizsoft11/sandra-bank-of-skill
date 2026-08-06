import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface PasswordPolicy {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export interface SystemSettings {
  _id?: string;
  platformName?: string;
  favicon?: string;
  supportEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string; // Hidden by default from API
  fromEmail?: string;
  smtpEncryption?: 'tls' | 'ssl';
  jwtExpiry?: string;
  passwordPolicy?: PasswordPolicy;
  sessionTimeout?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SystemSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.SERVER_URL}/api/admin/system-settings`;

  /**
   * Get current system settings
   */
  getSettings(): Observable<ApiResponse<SystemSettings>> {
    return this.http.get<ApiResponse<SystemSettings>>(this.apiUrl);
  }

  /**
   * Create new system settings (only if none exist)
   */
  createSettings(data: Partial<SystemSettings>): Observable<ApiResponse<SystemSettings>> {
    return this.http.post<ApiResponse<SystemSettings>>(this.apiUrl, data);
  }

  /**
   * Update all system settings (upsert)
   */
  updateSettings(data: Partial<SystemSettings>): Observable<ApiResponse<SystemSettings>> {
    return this.http.put<ApiResponse<SystemSettings>>(this.apiUrl, data);
  }

  /**
   * Update only general settings
   */
  updateGeneralSettings(data: {
    platformName?: string;
    favicon?: string;
    supportEmail?: string;
  }): Observable<ApiResponse<SystemSettings>> {
    return this.http.patch<ApiResponse<SystemSettings>>(`${this.apiUrl}/general`, data);
  }

  /**
   * Update only email settings
   */
  updateEmailSettings(data: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    smtpEncryption?: 'tls' | 'ssl';
    fromEmail?: string;
  }): Observable<ApiResponse<SystemSettings>> {
    return this.http.patch<ApiResponse<SystemSettings>>(`${this.apiUrl}/email`, data);
  }

  /**
   * Update only security settings
   */
  updateSecuritySettings(data: {
    jwtExpiry?: string;
    passwordPolicy?: PasswordPolicy;
    sessionTimeout?: number;
  }): Observable<ApiResponse<SystemSettings>> {
    return this.http.patch<ApiResponse<SystemSettings>>(`${this.apiUrl}/security`, data);
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings(): Observable<ApiResponse<SystemSettings>> {
    return this.http.post<ApiResponse<SystemSettings>>(`${this.apiUrl}/reset`, {});
  }

  /**
   * Send a test email to verify SMTP configuration
   */
  testEmailSettings(testEmail?: string): Observable<ApiResponse<{ success: boolean; messageId?: string }>> {
    return this.http.post<ApiResponse<{ success: boolean; messageId?: string }>>(`${this.apiUrl}/email/test`, { 
      testEmail: testEmail || ''
    });
  }
}
