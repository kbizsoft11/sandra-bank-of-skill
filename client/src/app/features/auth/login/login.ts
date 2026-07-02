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
      ]
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

    this.authService
      .login(this.loginForm.getRawValue())
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['admin/dashboard']);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }
}