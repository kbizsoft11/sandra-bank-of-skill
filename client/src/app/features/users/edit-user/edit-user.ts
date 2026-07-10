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
  Router,
  RouterLink
} from '@angular/router';

import { finalize } from 'rxjs';

import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
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

  private userId = '';

  readonly isResettingPassword = signal(false);
  readonly resetPasswordSuccess = signal('');
  readonly resetPasswordError = signal('');

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
        'employee',
        Validators.required
      ],

      isActive: [
        true
      ]

    });

  ngOnInit(): void {

    this.userId =
      this.route.snapshot.paramMap.get('id')!;

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
            role: userData.role,
            isActive: userData.isActive
          });

        }

      });

  }

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    this.userService
      .updateUser(
        this.userId,
        this.form.getRawValue()
      )
      .subscribe({

        next: () => {

          this.router.navigate([
            '/admin/users'
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