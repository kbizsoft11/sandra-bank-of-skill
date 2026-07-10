import {
  Component,
  OnInit,
  inject
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

import { UserService } from '../../../core/services/user.service';

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

  private userId = '';

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

}