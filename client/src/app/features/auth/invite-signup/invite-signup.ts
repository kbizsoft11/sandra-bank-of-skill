import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../../core/config/api.config';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
} from '../../../shared/validators/registration.validators';

@Component({
  selector: 'app-invite-signup',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-xl-6 col-lg-6 col-md-8">
          <div class="login-form-card">

            <div class="text-center mb-4">
              <h2 class="login-form-title">Complete Your Signup</h2>
              <p class="login-form-subtitle">
                Choose a password to activate your Bank Of Skill account
              </p>
            </div>

            @if (errorMessage()) {
              <div class="alert alert-danger">{{ errorMessage() }}</div>
            }

            @if (successMessage()) {
              <div class="alert alert-success">{{ successMessage() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">

              <!-- Full Name -->
              <div class="mb-4">
                <label class="form-label login-form-label">Full Name</label>

                <div class="login-input-group">
                  <span><i class="bi bi-person"></i></span>
                  <input
                    id="fullName"
                    type="text"
                    formControlName="fullName"
                    placeholder="Enter your full name"
                    class="form-control login-input"
                  />
                </div>

                @if (form.get('fullName')?.hasError('required') && form.get('fullName')?.touched) {
                  <p class="mt-1 text-sm text-red-500">Full name is required.</p>
                }
              </div>

              <!-- Password -->
              <div class="mb-3">
                <label class="form-label login-form-label">Password</label>

                <div class="login-input-group">
                  <span><i class="bi bi-lock"></i></span>
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Enter your password"
                    class="form-control login-input"
                  />
                  <button type="button" class="login-eye-btn" (click)="togglePassword()">
                    @if (showPassword()) {
                      <i class="bi bi-eye-slash"></i>
                    } @else {
                      <i class="bi bi-eye"></i>
                    }
                  </button>
                </div>

                @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                  <p class="mt-1 text-sm text-red-500">Password is required.</p>
                }
                @if (form.get('password')?.hasError('passwordStrength') && form.get('password')?.touched) {
                  <p class="mt-1 text-sm text-red-500">
                    Use at least 8 characters, uppercase, lowercase, number and a special character.
                  </p>
                }
              </div>

              <!-- Confirm Password -->
              <div class="mb-4">
                <label class="form-label login-form-label">Confirm Password</label>

                <div class="login-input-group">
                  <span><i class="bi bi-lock"></i></span>
                  <input
                    id="confirmPassword"
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="Re-enter your password"
                    class="form-control login-input"
                  />
                  <button type="button" class="login-eye-btn" (click)="toggleConfirmPassword()">
                    @if (showConfirmPassword()) {
                      <i class="bi bi-eye-slash"></i>
                    } @else {
                      <i class="bi bi-eye"></i>
                    }
                  </button>
                </div>

                @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
                  <p class="mt-1 text-sm text-red-500">Passwords do not match.</p>
                }
              </div>

              <!-- Submit -->
              <button type="submit" [disabled]="isLoading()" class="btn login-main-btn w-100">
                @if (isLoading()) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  <span>Creating account...</span>
                } @else {
                  <span>Create Account</span>
                }
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InviteSignup implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  form!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, passwordStrengthValidator()]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: [passwordMatchValidator()],
    });

    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      if (!token) {
        this.errorMessage.set('The invitation link is missing a token. Please request a new invite.');
      }
      this.form.addControl('token', this.fb.control(token || ''));
    });
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  submit(): void {
    Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched());
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = this.form.getRawValue();

    this.http.post(`${API_CONFIG.BASE_URL}/auth/invite/accept`, payload).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        this.successMessage.set('Account created successfully. Redirecting to your dashboard...');
        this.authService.setSession(response.data.token);
        this.alertService.toast('Account created successfully', 'success');
        setTimeout(() => this.router.navigate(['/employee/dashboard']), 800);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Unable to activate your invitation. Please try again.');
      }
    });
  }
}