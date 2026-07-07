import { ChangeDetectorRef, Component, inject, NgZone, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { RegistrationService } from '../../../core/services/registration.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
  standalone: true
})
export class VerifyEmail implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  otpForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  // Email from registration
  email = '';
  maskedEmail = '';

  // Countdown timer
  countdownSeconds = 30;
  canResend = false;
  private countdownTimer?: number;

  ngOnInit(): void {
    this.initializeForm();
    this.loadEmailFromState();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
    }
  }

  /**
   * Initialize OTP form
   */
  private initializeForm(): void {
    this.otpForm = this.fb.group({
      digit1: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit2: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit3: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit4: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit5: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit6: ['', [Validators.required, Validators.pattern(/^\d$/)]]
    });
  }

  /**
   * Load email from registration state
   */
  private loadEmailFromState(): void {
    const step1Data = this.registrationService.getStep1Data();
    if (step1Data?.email) {
      this.email = step1Data.email;
      this.maskedEmail = this.maskEmail(step1Data.email);
    } else {
      // No email found, redirect to step 1
      this.router.navigate(['/auth/register']);
    }
  }

  /**
   * Mask email for display (j***@example.com)
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '***';
    return `${maskedUsername}@${domain}`;
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
    }

    this.countdownSeconds = 30;
    this.canResend = false;
    this.cdr.markForCheck();

    this.countdownTimer = window.setInterval(() => {
      this.ngZone.run(() => {
        this.countdownSeconds--;
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        if (this.countdownSeconds <= 0) {
          this.canResend = true;
          window.clearInterval(this.countdownTimer);
          this.countdownTimer = undefined;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }
      });
    }, 1000);
  }

  /**
   * Format countdown for display (00:30)
   */
  get formattedCountdown(): string {
    const minutes = Math.floor(this.countdownSeconds / 60);
    const seconds = this.countdownSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Handle OTP input with auto-tab
   */
  onOtpInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value;

    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      input.value = '';
      return;
    }

    // Auto-tab to next input
    if (value && index < 5) {
      const inputs = Array.from(document.querySelectorAll('.verify-otp-input')) as HTMLInputElement[];
      inputs[index + 1]?.focus();
    }
  }

  /**
   * Handle backspace key
   */
  onOtpKeyDown(event: any, index: number): void {
    const input = event.target;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      // Move to previous input on backspace
      const inputs = Array.from(document.querySelectorAll('.verify-otp-input')) as HTMLInputElement[];
      inputs[index - 1]?.focus();
    }
  }

  /**
   * Handle paste event
   */
  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      // Distribute digits across inputs
      const digits = pastedData.split('');
      const inputs = Array.from(document.querySelectorAll('.verify-otp-input')) as HTMLInputElement[];
      
      digits.forEach((digit, index) => {
        if (inputs[index]) {
          inputs[index].value = digit;
          this.otpForm.get(`digit${index + 1}`)?.setValue(digit);
        }
      });

      // Focus last input
      inputs[5]?.focus();
    }
  }

  /**
   * Get OTP value from form
   */
  private getOtpValue(): string {
    const values = this.otpForm.value;
    return `${values.digit1}${values.digit2}${values.digit3}${values.digit4}${values.digit5}${values.digit6}`;
  }

  /**
   * Clear OTP inputs
   */
  private clearOtp(): void {
    this.otpForm.reset();
    const inputs = Array.from(document.querySelectorAll('.verify-otp-input')) as HTMLInputElement[];
    inputs[0]?.focus();
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.otpForm.invalid) {
      this.errorMessage = 'Please enter all 6 digits';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const otp = this.getOtpValue();

    this.registrationService.verifyOTP({
      email: this.email,
      otp: otp
    }).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (response) => {
        console.log('OTP verification successful:', response);
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/auth/organisation-details']);
        }, 0);
      },
      error: (error) => {
        console.error('OTP verification error:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.clearOtp();

        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Invalid verification code. Please try again.';
        }
      }
    });
  }

  /**
   * Resend OTP
   */
  onResendOtp(): void {
    if (!this.canResend) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.registrationService.resendOTP({ email: this.email }).subscribe({
      next: (response) => {
        console.log('OTP resent successfully:', response);
        this.isLoading = false;
        this.errorMessage = '';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        
        // Restart countdown
        this.startCountdown();
        
        // Show success message
        alert('Verification code sent successfully!');
      },
      error: (error) => {
        console.error('Resend OTP error:', error);
        this.isLoading = false;
        
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Failed to resend code. Please try again.';
        }
      }
    });
  }
}
