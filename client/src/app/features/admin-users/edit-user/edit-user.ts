import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminUsersService, User } from '../../../core/services/admin-users.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-user.html',
  styleUrl: './edit-user.scss',
})
export class EditUserComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly user = signal<User | null>(null);
  readonly form = signal<FormGroup | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly roles = ['admin', 'company', 'employee'];
  readonly statuses = ['active', 'suspended', 'invited', 'joined'];

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.error.set('User ID not found');
      return;
    }

    this.loading.set(true);
    this.adminUsersService.getUserById(userId).subscribe({
      next: (response) => {
        if (response.data) {
          this.user.set(response.data);
          this.initializeForm(response.data);
          this.error.set(null);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.error.set(error.error?.message || 'Failed to load user details');
        this.alertService.error('Failed to load user details');
        this.loading.set(false);
      },
    });
  }

  private initializeForm(user: User): void {
    this.form.set(
      this.fb.group({
        fullName: [user.fullName, [Validators.required, Validators.minLength(3)]],
        email: [user.email, [Validators.required, Validators.email]],
        phone: [user.phone || '', [Validators.pattern(/^[0-9\-+\s()]*$/)]],
        role: [user.role, Validators.required],
        department: [user.department || ''],
        title: [user.title || ''],
        location: [user.location || ''],
        accountStatus: [user.accountStatus, Validators.required],
      })
    );
  }

  onSubmit(): void {
    const form = this.form();
    if (!form || form.invalid) {
      this.alertService.error('Please fill in all required fields correctly');
      return;
    }

    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.alertService.error('User ID not found');
      return;
    }

    this.submitting.set(true);
    const userData = form.value;

    this.adminUsersService.updateUser(userId, userData).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.alertService.success('User updated successfully');
        this.router.navigate(['/admin/users', userId]);
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Error updating user:', error);
        this.alertService.error(error.error?.message || 'Failed to update user');
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/users', this.user()?._id]);
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  getErrorMessage(fieldName: string): string {
    const form = this.form();
    if (!form) return '';

    const control = form.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (control.errors['minlength']) {
      return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['pattern']) {
      return `${fieldName} contains invalid characters`;
    }

    return 'Invalid input';
  }

  hasError(fieldName: string): boolean {
    const form = this.form();
    if (!form) return false;

    const control = form.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
