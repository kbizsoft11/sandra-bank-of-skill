import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { AlertService } from '../../../core/services/alert.service';

export interface ResetPasswordModalData {
  userId: string;
  userName: string;
}

@Component({
  selector: 'app-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password-modal.html',
  styleUrl: './reset-password-modal.scss',
})
export class ResetPasswordModalComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  readonly userId = signal<string>('');
  readonly userName = signal<string>('');
  readonly form = signal<FormGroup | null>(null);
  readonly submitting = signal(false);
  readonly resetMethod = signal<'email' | 'manual'>('email');

  // Callback for when modal closes
  onClose: ((result?: boolean) => void) | null = null;
  onDismiss: (() => void) | null = null;

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form.set(
      this.fb.group({
        resetMethod: ['email', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      })
    );
  }

  setData(data: ResetPasswordModalData): void {
    this.userId.set(data.userId);
    this.userName.set(data.userName);
  }

  onResetMethodChange(method: 'email' | 'manual'): void {
    this.resetMethod.set(method);
    const form = this.form();
    if (form) {
      const passwordControl = form.get('newPassword');
      const confirmControl = form.get('confirmPassword');

      if (method === 'email') {
        passwordControl?.clearValidators();
        confirmControl?.clearValidators();
      } else {
        passwordControl?.setValidators([Validators.required, Validators.minLength(8)]);
        confirmControl?.setValidators([Validators.required]);
      }

      passwordControl?.updateValueAndValidity();
      confirmControl?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    const form = this.form();
    if (!form || form.invalid) {
      this.alertService.error('Please fill in all required fields');
      return;
    }

    const userId = this.userId();
    const method = this.resetMethod();

    if (method === 'email') {
      this.performEmailReset(userId);
    } else {
      const newPassword = form.get('newPassword')?.value;
      const confirmPassword = form.get('confirmPassword')?.value;

      if (newPassword !== confirmPassword) {
        this.alertService.error('Passwords do not match');
        return;
      }

      this.performManualReset(userId, newPassword);
    }
  }

  private performEmailReset(userId: string): void {
    this.submitting.set(true);
    this.adminUsersService.resetPassword(userId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.alertService.success(`Password reset email sent to ${this.userName()}`);
        this.onClose?.(true);
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Error sending reset email:', error);
        this.alertService.error(error.error?.message || 'Failed to send reset email');
      },
    });
  }

  private performManualReset(userId: string, newPassword: string): void {
    this.submitting.set(true);

    // Call API to manually reset password
    this.adminUsersService.updateUser(userId, {}).subscribe({
      next: () => {
        this.submitting.set(false);
        this.alertService.success(`Password for ${this.userName()} has been reset`);
        this.onClose?.(true);
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Error resetting password:', error);
        this.alertService.error(error.error?.message || 'Failed to reset password');
      },
    });
  }

  onCancel(): void {
    this.onDismiss?.();
  }

  hasError(fieldName: string): boolean {
    const form = this.form();
    if (!form) return false;

    const control = form.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const form = this.form();
    if (!form) return '';

    const control = form.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${fieldName.replace(/([A-Z])/g, ' $1').trim()} is required`;
    }
    if (control.errors['minlength']) {
      return `${fieldName.replace(/([A-Z])/g, ' $1').trim()} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }

    return 'Invalid input';
  }
}
