import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUsersService, User } from '../../../core/services/admin-users.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users-list.html',
  styleUrl: './admin-users-list.scss',
})
export class AdminUsersList implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // State signals
  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  // Filter/Search signals
  readonly searchTerm = signal('');
  readonly selectedCompany = signal('');
  readonly selectedRole = signal('');
  readonly selectedStatus = signal('');
  readonly sortBy = signal('fullName');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');

  readonly companies = signal<string[]>([]);
  readonly roles = signal<string[]>(['admin', 'company', 'employee']);
  readonly statuses = signal<string[]>(['active', 'suspended', 'invited', 'joined']);

  // Form
  readonly filterForm = signal<FormGroup | null>(null);

  // Expose Math object for template
  readonly Math = Math;

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsers();
  }

  private initializeForm(): void {
    this.filterForm.set(
      this.fb.group({
        search: [''],
        company: [''],
        role: [''],
        status: [''],
      })
    );
  }

  loadUsers(): void {
    this.loading.set(true);

    this.adminUsersService
      .getAllUsers(
        this.page(),
        this.limit(),
        this.searchTerm(),
        this.selectedCompany(),
        this.selectedRole(),
        this.selectedStatus(),
        this.sortBy(),
        this.sortOrder()
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.users.set(response.data.users || []);
            if (response.data.pagination) {
              this.total.set(response.data.pagination.total);
            }
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.alertService.error('Failed to load users');
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    const form = this.filterForm();
    if (form) {
      const values = form.value;
      this.searchTerm.set(values.search || '');
      this.selectedCompany.set(values.company || '');
      this.selectedRole.set(values.role || '');
      this.selectedStatus.set(values.status || '');
      this.page.set(1);
      this.loadUsers();
    }
  }

  onSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.loadUsers();
  }

  onPreviousPage(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.loadUsers();
    }
  }

  onNextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.loadUsers();
    }
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.loadUsers();
    }
  }

  activateUser(userId: string, userName: string): void {
    this.alertService.confirm(
      `Are you sure you want to activate ${userName}?`,
      'Activate User',
      'Yes, activate',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.adminUsersService.activateUser(userId).subscribe({
          next: () => {
            this.alertService.success(`${userName} has been activated`);
            this.loadUsers();
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Failed to activate user');
          },
        });
      }
    });
  }

  deactivateUser(userId: string, userName: string): void {
    this.alertService.confirm(
      `Are you sure you want to deactivate ${userName}?`,
      'Deactivate User',
      'Yes, deactivate',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.adminUsersService.deactivateUser(userId).subscribe({
          next: () => {
            this.alertService.success(`${userName} has been deactivated`);
            this.loadUsers();
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Failed to deactivate user');
          },
        });
      }
    });
  }

  deleteUser(userId: string, userName: string): void {
    this.alertService.confirm(
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      'Delete User',
      'Yes, delete',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.adminUsersService.deleteUser(userId).subscribe({
          next: () => {
            this.alertService.success(`${userName} has been deleted`);
            this.loadUsers();
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Failed to delete user');
          },
        });
      }
    });
  }

  resetPassword(userId: string, userName: string): void {
    this.alertService.confirm(
      `Are you sure you want to reset password for ${userName}? They will receive an email with a new password.`,
      'Reset Password',
      'Yes, reset',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.adminUsersService.resetPassword(userId).subscribe({
          next: () => {
            this.alertService.success(`Password reset email sent to ${userName}`);
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Failed to reset password');
          },
        });
      }
    });
  }

  impersonateUser(userId: string, userName: string): void {
    this.alertService.confirm(
      `Are you sure you want to impersonate ${userName}?`,
      'Impersonate User',
      'Yes, impersonate',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        // Call impersonate endpoint
        this.adminUsersService.impersonateUser(userId).subscribe({
          next: (response) => {
            if (response.data?.token) {
              // Replace the current accessToken with impersonate token
              localStorage.setItem('accessToken', response.data.token);
              sessionStorage.setItem('accessToken', response.data.token);
              
              // Reload page to apply new token
              window.location.reload();
            }
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Failed to impersonate user');
          },
        });
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge bg-success';
      case 'suspended':
        return 'badge bg-danger';
      case 'invited':
        return 'badge bg-warning';
      case 'joined':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge bg-danger';
      case 'company':
        return 'badge bg-primary';
      case 'employee':
        return 'badge bg-success';
      default:
        return 'badge bg-secondary';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.page();
    const pages: number[] = [];

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push(-1); // placeholder for ellipsis
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < total) {
      if (endPage < total - 1) {
        pages.push(-1); // placeholder for ellipsis
      }
      pages.push(total);
    }

    return pages;
  }
}
