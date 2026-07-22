import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemSettingsService, SystemSettings, PasswordPolicy } from '../../core/services/system-settings.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.scss',
})
export class SystemSettingsComponent implements OnInit {
  private readonly systemSettingsService = inject(SystemSettingsService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  // Form signals
  readonly generalForm = signal<FormGroup | null>(null);
  readonly emailForm = signal<FormGroup | null>(null);
  readonly securityForm = signal<FormGroup | null>(null);

  // State signals
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly activeTab = signal<'general' | 'email' | 'security'>('general');

  // File upload signals
  readonly logoPreview = signal<string | null>(null);
  readonly faviconPreview = signal<string | null>(null);

  // Defaults
  readonly jwtExpiryOptions = ['1d', '3d', '7d', '14d', '30d'];
  readonly passwordPolicyDefaults = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  };

  ngOnInit(): void {
    this.initializeForms();
    this.loadSettings();
  }

  /**
   * Initialize all forms
   */
  private initializeForms(): void {
    this.generalForm.set(
      this.fb.group({
        platformName: ['', [Validators.required, Validators.minLength(3)]],
        supportEmail: ['', [Validators.required, Validators.email]],
        logo: [''],
        favicon: [''],
      })
    );

    this.emailForm.set(
      this.fb.group({
        smtpHost: ['', [Validators.required, Validators.minLength(3)]],
        smtpPort: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
        smtpUsername: ['', Validators.required],
        smtpPassword: ['', Validators.required],
        fromEmail: ['', [Validators.required, Validators.email]],
      })
    );

    this.securityForm.set(
      this.fb.group({
        jwtExpiry: ['7d', Validators.required],
        sessionTimeout: [30, [Validators.required, Validators.min(5), Validators.max(1440)]],
        passwordPolicy: this.fb.group({
          minLength: [8, [Validators.required, Validators.min(6), Validators.max(32)]],
          requireUppercase: [true],
          requireLowercase: [true],
          requireNumbers: [true],
          requireSpecialChars: [false],
        }),
      })
    );
  }

  /**
   * Load existing settings
   */
  loadSettings(): void {
    this.loading.set(true);

    this.systemSettingsService.getSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateForms(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading system settings:', error);
        this.alertService.error('Failed to load system settings');
        this.loading.set(false);
      },
    });
  }

  /**
   * Populate forms with existing data
   */
  private populateForms(data: SystemSettings): void {
    // Populate general form
    if (this.generalForm()) {
      this.generalForm()!.patchValue({
        platformName: data.platformName,
        supportEmail: data.supportEmail,
      });

      if (data.logo) {
        this.logoPreview.set(data.logo);
      }
      if (data.favicon) {
        this.faviconPreview.set(data.favicon);
      }
    }

    // Populate email form
    if (this.emailForm()) {
      this.emailForm()!.patchValue({
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort || 587,
        smtpUsername: data.smtpUsername,
        fromEmail: data.fromEmail,
      });
    }

    // Populate security form
    if (this.securityForm()) {
      this.securityForm()!.patchValue({
        jwtExpiry: data.jwtExpiry || '7d',
        sessionTimeout: data.sessionTimeout || 30,
        passwordPolicy: data.passwordPolicy || this.passwordPolicyDefaults,
      });
    }
  }

  /**
   * Save all changes
   */
  saveAllSettings(): void {
    if (!this.validateAllForms()) {
      this.alertService.error('Please fix form errors before saving');
      return;
    }

    this.saving.set(true);

    const formData = {
      ...this.generalForm()!.value,
      ...this.emailForm()!.value,
      ...this.securityForm()!.value,
    };

    this.systemSettingsService.updateSettings(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('System settings saved successfully');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving system settings:', error);
        this.alertService.error(error.error?.error || 'Failed to save system settings');
        this.saving.set(false);
      },
    });
  }

  /**
   * Save general settings only
   */
  saveGeneralSettings(): void {
    if (!this.generalForm()!.valid) {
      this.alertService.error('Please fix form errors before saving');
      return;
    }

    this.saving.set(true);

    this.systemSettingsService.updateGeneralSettings(this.generalForm()!.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('General settings saved successfully');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving general settings:', error);
        this.alertService.error(error.error?.error || 'Failed to save general settings');
        this.saving.set(false);
      },
    });
  }

  /**
   * Save email settings only
   */
  saveEmailSettings(): void {
    if (!this.emailForm()!.valid) {
      this.alertService.error('Please fix form errors before saving');
      return;
    }

    this.saving.set(true);

    this.systemSettingsService.updateEmailSettings(this.emailForm()!.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Email settings saved successfully');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving email settings:', error);
        this.alertService.error(error.error?.error || 'Failed to save email settings');
        this.saving.set(false);
      },
    });
  }

  /**
   * Save security settings only
   */
  saveSecuritySettings(): void {
    if (!this.securityForm()!.valid) {
      this.alertService.error('Please fix form errors before saving');
      return;
    }

    this.saving.set(true);

    this.systemSettingsService.updateSecuritySettings(this.securityForm()!.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Security settings saved successfully');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving security settings:', error);
        this.alertService.error(error.error?.error || 'Failed to save security settings');
        this.saving.set(false);
      },
    });
  }

  /**
   * Reset all settings to defaults
   */
  resetAllSettings(): void {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }

    this.saving.set(true);

    this.systemSettingsService.resetSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateForms(response.data);
          this.alertService.success('Settings reset to defaults successfully');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error resetting settings:', error);
        this.alertService.error('Failed to reset settings');
        this.saving.set(false);
      },
    });
  }

  /**
   * Handle file upload for logo
   */
  onLogoUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        this.logoPreview.set(base64String);
        this.generalForm()!.patchValue({ logo: base64String });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Handle file upload for favicon
   */
  onFaviconUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        this.faviconPreview.set(base64String);
        this.generalForm()!.patchValue({ favicon: base64String });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Validate all forms
   */
  private validateAllForms(): boolean {
    return (
      this.generalForm()!.valid &&
      this.emailForm()!.valid &&
      this.securityForm()!.valid
    );
  }

  /**
   * Reset general form
   */
  resetGeneralForm(): void {
    this.generalForm()!.reset();
    this.logoPreview.set(null);
    this.faviconPreview.set(null);
    this.loadSettings();
  }

  /**
   * Reset email form
   */
  resetEmailForm(): void {
    this.emailForm()!.reset();
    this.loadSettings();
  }

  /**
   * Reset security form
   */
  resetSecurityForm(): void {
    this.securityForm()!.reset();
    this.loadSettings();
  }

  /**
   * Get form control for template
   */
  getControl(form: FormGroup | null, controlName: string) {
    return form?.get(controlName);
  }

  /**
   * Get nested form control
   */
  getNestedControl(form: FormGroup | null, groupName: string, controlName: string) {
    return form?.get(groupName)?.get(controlName);
  }
}
