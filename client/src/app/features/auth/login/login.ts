import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService =
    inject(AuthService);

  private readonly alertService =
    inject(AlertService);

  private readonly router =
    inject(Router);

  readonly loading = signal(false);
  readonly viewPassword = signal(false);

  readonly loginForm =
    this.fb.nonNullable.group({
      email: [
        '',
        [Validators.required, Validators.email]
      ],
      password: [
        '',
        [Validators.required]
      ],
      rememberMe: [false]
    });

  togglePassword(): void{
    if(this.viewPassword() == true){
      this.viewPassword.set(false);
    }else{
      this.viewPassword.set(true);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const formValue = this.loginForm.getRawValue();
    const { email, password, rememberMe } = formValue;

    this.authService
      .login({ email, password }, rememberMe)
      .subscribe({
        next: () => {
          this.loading.set(false);
          // Give a small delay to ensure user data is set, then redirect to role-specific dashboard
          setTimeout(() => {
            const dashboardPath = this.authService.getRoleDashboardPath();
            this.router.navigate([dashboardPath]);
          }, 100);
        },
        error: (error) => {
          this.loading.set(false);
          
          // Show SweetAlert2 error popup instead of browser alert
          const errorMessage = error?.error?.message || 'Invalid email or password.';
          this.alertService.error(errorMessage, 'Login Failed');
        }
      });
  }
}