import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SystemSettingsService, SystemSettings, PasswordPolicy } from '../../core/services/system-settings.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

  // State signals
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly activeTab = signal<'general' | 'email'>('general');

  // Password visibility signal
  readonly passwordVisible = signal(false);
  
  // Track if password already exists in DB
  readonly passwordExists = signal(false);
  
  // Test email modal state
  readonly showTestModal = signal(false);
  readonly testEmailAddress = signal('');
  readonly testEmailLoading = signal(false);

  // File upload signals
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
        favicon: [''],
      })
    );

    this.emailForm.set(
      this.fb.group({
        smtpHost: ['', [Validators.required, Validators.minLength(3)]],
        smtpPort: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
        smtpUsername: ['', Validators.required],
        smtpPassword: ['', Validators.required], // Will be updated to optional in populateForms
        smtpEncryption: ['tls', Validators.required],
        fromEmail: ['', [Validators.required, Validators.email]],
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
        smtpEncryption: data.smtpEncryption || 'tls',
        fromEmail: data.fromEmail,
      });

      // Check if password already exists in database
      // If it does, make password field optional
      const passwordControl = this.emailForm()!.get('smtpPassword');
      if (data.smtpPassword) {
        // Password exists in DB - make it optional
        this.passwordExists.set(true);
        passwordControl?.setValidators([]); // Remove all validators
        passwordControl?.updateValueAndValidity();
      } else {
        // No password in DB - make it required
        this.passwordExists.set(false);
        passwordControl?.setValidators([Validators.required]);
        passwordControl?.updateValueAndValidity();
      }
    }
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

    // Build the data to send - only include password if it has a value
    const formData = this.emailForm()!.value;
    const dataToSend: any = {
      smtpHost: formData.smtpHost,
      smtpPort: formData.smtpPort,
      smtpUsername: formData.smtpUsername,
      smtpEncryption: formData.smtpEncryption,
      fromEmail: formData.fromEmail,
    };

    // Only include password if it has a value (not empty string)
    if (formData.smtpPassword && formData.smtpPassword.trim()) {
      dataToSend.smtpPassword = formData.smtpPassword;
    }

    this.systemSettingsService.updateEmailSettings(dataToSend).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Email settings saved successfully');
          this.loadSettings(); // Reload to get fresh state
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
      this.emailForm()!.valid
    );
  }

  /**
   * Reset general form
   */
  resetGeneralForm(): void {
    this.generalForm()!.reset();
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
   * Test email configuration
   */
  testEmailConfiguration(): void {
    console.log('testEmailConfiguration called');
    console.log('emailForm valid:', this.emailForm()!.valid);
    
    if (!this.emailForm()!.valid) {
      this.alertService.error('Please fill in all required email settings first');
      return;
    }

    // Set test email to current user's email by default
    this.testEmailAddress.set('');
    console.log('Setting showTestModal to true');
    this.showTestModal.set(true);
    console.log('showTestModal signal:', this.showTestModal());
  }

  /**
   * Send test email
   */
  sendTestEmail(): void {
    const email = this.testEmailAddress().trim();

    if (!email) {
      this.alertService.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.alertService.error('Please enter a valid email address');
      return;
    }

    this.testEmailLoading.set(true);

    this.systemSettingsService.testEmailSettings(email).subscribe({
      next: (response) => {
        if (response.success) {
          const message = (response as any).message || `Test email sent to ${email}`;
          this.alertService.success(message);
          this.showTestModal.set(false);
          this.testEmailAddress.set('');
        } else {
          this.alertService.error((response as any).error || 'Test email failed');
        }
        this.testEmailLoading.set(false);
      },
      error: (error) => {
        console.error('Error testing email settings:', error);
        this.alertService.error(error.error?.error || 'Failed to send test email. Please check your SMTP configuration.');
        this.testEmailLoading.set(false);
      },
    });
  }

  /**
   * Close test email modal
   */
  closeTestModal(): void {
    this.showTestModal.set(false);
    this.testEmailAddress.set('');
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
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
