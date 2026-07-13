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

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { UserService } from '../../../core/services/user.service';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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

  showPassword = false;
  isSubmitting = false;

  readonly selectedPhoto = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly photoError = signal<string>('');

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

      password: [
        '',
        [
          Validators.minLength(6)
        ]
      ],

      role: [
        'company',
        Validators.required
      ],

      isActive: [
        true
      ]

    });

  /**
   * Handle photo selection from file input
   */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.photoError.set('');

    if (!file) {
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.photoError.set('Please select a JPG, PNG, or WEBP image.');
      input.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      this.photoError.set('Image must be smaller than 5MB.');
      input.value = '';
      return;
    }

    this.selectedPhoto.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so selecting the same file again still fires 'change'
    input.value = '';
  }

  /**
   * Remove the selected photo
   */
  removePhoto(): void {
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
    this.photoError.set('');
  }

  /**
   * Generate a random secure password
   */
  generatePassword(): void {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const password = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      special[Math.floor(Math.random() * special.length)],
    ];

    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 12; i++) {
      password.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    const generatedPassword = password.join('');
    this.form.patchValue({ password: generatedPassword });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.userService
      .createUser(
        this.form.getRawValue()
      )
      .subscribe({

        next: (response) => {

          const newUserId = response?.data?._id;
          const photo = this.selectedPhoto();

          // If no photo was picked, or we couldn't determine the new user's ID,
          // just navigate away — the user was still created successfully.
          if (!photo || !newUserId) {
            this.isSubmitting = false;
            this.router.navigate(['/admin/users']);
            return;
          }

          // Upload the photo as a second step now that we have the new user's ID
          this.userService.uploadUserProfilePicture(newUserId, photo).subscribe({
            next: () => {
              this.isSubmitting = false;
              this.router.navigate(['/admin/users']);
            },
            error: (err) => {
              console.error('User created, but photo upload failed:', err);
              this.isSubmitting = false;
              // Still navigate — the user exists, only the photo failed
              this.router.navigate(['/admin/users']);
            }
          });

        },

        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
        }

      });

  }

}