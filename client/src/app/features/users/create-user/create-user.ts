import {
  Component,
  inject
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './create-user.html'
})
export class CreateUser {

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly userService =
    inject(UserService);

  readonly form =
    this.fb.nonNullable.group({

      firstName: [
        '',
        Validators.required
      ],

      lastName: [''],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
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

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    this.userService
      .createUser(
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

}