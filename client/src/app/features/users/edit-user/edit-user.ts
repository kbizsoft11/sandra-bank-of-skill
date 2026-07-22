import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { finalize } from 'rxjs';

import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './edit-user.html'
})
export class EditUser implements OnInit {

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly userService =
    inject(UserService);

  private readonly alertService =
    inject(AlertService);

  readonly auth =
    inject(AuthService);

  private userId = '';

  readonly isResettingPassword = signal(false);
  readonly resetPasswordSuccess = signal('');
  readonly resetPasswordError = signal('');

  /**
   * The only role the currently logged-in actor is allowed to assign.
   * - admin manages companies only
   * - company manages employees only
   */
  get allowedRole(): 'employee' | 'company' {
    return this.auth.role() === 'admin' ? 'company' : 'employee';
  }

  readonly form =
    this.fb.nonNullable.group({

      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      role: [
        { value: 'employee', disabled: true },
        Validators.required
      ],

      isActive: [
        true
      ]

    });

  ngOnInit(): void {

    this.userId =
      this.route.snapshot.paramMap.get('id')!;

    // Lock the role field to whatever this actor is permitted to manage
    this.form.get('role')?.setValue(this.allowedRole);
    this.form.get('role')?.disable();

    this.loadUser();

  }

  loadUser(): void {

    this.userService
      .getUserById(this.userId)
      .subscribe({

        next: (response) => {

          const userData = response.data;

          const fullName = userData.fullName;

          this.form.patchValue({
            fullName,
            email: userData.email,
            isActive: userData.isActive
          });

          // Role stays locked to allowedRole regardless of what's loaded,
          // since this actor is only permitted to manage one role type
          this.form.get('role')?.setValue(this.allowedRole);

        }

      });

  }

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    // getRawValue() includes disabled controls, so role is sent correctly
    this.userService
      .updateUser(
        this.userId,
        this.form.getRawValue()
      )
      .subscribe({

        next: () => {

          const role = this.auth.role();
          const basePath = role === 'admin' ? '/admin' : `/${role}`;

          this.router.navigate([
            `${basePath}/users`
          ]);

        }

      });

  }

  /**
   * Reset user password
   */
  resetPassword(): void {
    const userEmail = this.form.get('email')?.value;
    
    this.alertService.confirm(
      `A new password will be generated and sent to ${userEmail}`,
      'Are you sure you want to reset the password?',
      'Yes, reset password',
      'Cancel'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.isResettingPassword.set(true);
      this.resetPasswordSuccess.set('');
      this.resetPasswordError.set('');

      this.userService.resetUserPassword(this.userId)
        .pipe(
          finalize(() => this.isResettingPassword.set(false))
        )
        .subscribe({
          next: () => {
            this.alertService.success(
              'A new password has been sent to the user\'s email.',
              'Password Reset Successfully'
            );
          },
          error: (error) => {
            this.alertService.error(
              error.error?.message || 'Failed to reset password. Please try again.'
            );
          }
        });
    });
  }

}