import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { RegistrationService } from '../../../core/services/registration.service';
import { AlertService } from '../../../core/services/alert.service';
import { RegistrationProgress } from '../../../shared/components/registration-progress/registration-progress';

import {
  passwordStrengthValidator,
  passwordMatchValidator,
  phoneFormatValidator,
  fullNameValidator
} from '../../../shared/validators/registration.validators';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, RegistrationProgress],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  standalone: true
})
export class Register implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly registrationService = inject(RegistrationService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  registerForm!: FormGroup;

  // ✅ Converted to signals for zoneless change detection
  isLoading = signal(false);
  errorMessage = signal('');
  registeredEmailWarning = signal('');

  showPassword = false;
  showConfirmPassword = false;
  hasExistingRegistration = false;

  // Progress tracking
  currentStep = this.registrationService.currentStep();
  completedSteps = this.registrationService.completedSteps();

  ngOnInit(): void {
    this.checkExistingRegistration();
    this.initializeForm();
    this.prefillFormData();
  }

  /**
   * Check if user has an existing registration in progress
   */
  private checkExistingRegistration(): void {
    this.hasExistingRegistration = this.registrationService.isRegistrationInProgress() &&
                                     !this.registrationService.isExpired();
  }

  /**
   * Clear existing registration and start fresh
   */
  clearExistingRegistration(): void {
    this.alertService.confirm(
      'Your current progress will be lost.',
      'Are you sure you want to start a new registration?',
      'Yes, start fresh',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.registrationService.clearRegistration();
        this.hasExistingRegistration = false;
        this.registerForm.reset({
          termsAccepted: false
        });
        this.alertService.toast('Registration cleared successfully', 'success');
      }
    });
  }


  /**
   * Initialize registration form with validation
   */
  private initializeForm(): void {
    this.registerForm = this.fb.group({
      fullName: [
        '',
        [Validators.required, fullNameValidator(), Validators.minLength(2), Validators.maxLength(100)]
      ],
      email: [
        '',
        [Validators.required, Validators.email]
      ],
      phone: [
        '',
        [Validators.required, phoneFormatValidator()]
      ],
      password: [
        '',
        [Validators.required, passwordStrengthValidator()]
      ],
      confirmPassword: [
        '',
        [Validators.required]
      ],
      termsAccepted: [
        false,
        [Validators.requiredTrue]
      ]
    }, {
      validators: [passwordMatchValidator()]
    });
  }

  /**
   * Prefill form with saved data (if user is returning)
   */
  private prefillFormData(): void {
    const savedData = this.registrationService.getStep1Data();
    if (savedData) {
      this.registerForm.patchValue({
        fullName: savedData.fullName,
        email: savedData.email,
        phone: savedData.phone
      });
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  /**
   * Check if form field has error
   */
  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.registerForm.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return field.hasError(errorType) && (field.dirty || field.touched);
    }
    return field.invalid && (field.dirty || field.touched);
  }

  /**
   * Get password strength error details
   */
  getPasswordErrors(): any {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl?.hasError('passwordStrength')) {
      return passwordControl.getError('passwordStrength');
    }
    return null;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });

    if (this.registerForm.invalid) {
      // No generic banner for form validation — every field (including
      // password mismatch on Confirm Password) already shows its own
      // inline error message right below it.
      return;
    }

    // ✅ Use .set() for signals
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.registeredEmailWarning.set('');

    const formData = this.registerForm.value;

    this.registrationService.registerStep1(formData).subscribe({
      next: (response) => {
        console.log('Registration Step 1 successful:', response);
        this.isLoading.set(false);

        // Navigate to verify email step
        this.router.navigate(['/auth/verify-email']);
      },

      error: (error) => {
        console.error('Registration Step 1 error:', error);
        this.isLoading.set(false);

        // Handle different error scenarios
        if (error.status === 409) {
          this.registeredEmailWarning.set(
            error.error?.message || 'Email is already registered. Please login instead.'
          );
          this.errorMessage.set('');
        } else if (error.error?.message) {
          this.errorMessage.set(error.error.message);
        } else if (error.status === 0) {
          this.errorMessage.set('Unable to connect to server. Please check your connection.');
        } else {
          this.errorMessage.set('Registration failed. Please try again.');
        }
      }
    });
  }
}
