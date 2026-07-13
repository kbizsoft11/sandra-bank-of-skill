import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TableActions
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {

  private userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly users = signal<any[]>([]);
  
  // For admin hierarchy view
  readonly viewingCompanyEmployees = signal<boolean>(false);
  readonly selectedCompany = signal<any | null>(null);
  
  // Filtered users based on role and view state
  readonly displayedUsers = computed(() => {
    const userRole = this.auth.role();
    
    if (userRole === 'admin') {
      // If viewing employees of a company, show those employees
      if (this.viewingCompanyEmployees()) {
        return this.users();
      }
      // Otherwise show companies
      return this.users();
    } else if (userRole === 'company') {
      // Company sees only employees
      return this.users().filter((user: any) => this.isEmployee(user));
    }
    
    // Default: show all users
    return this.users();
  });

  // Invite modal state
  showInviteModal = false;
  inviteForm!: FormGroup;
  isInviting = false;
  inviteError = '';
  inviteSuccess = '';

  ngOnInit(): void {
    this.loadUsers();
    this.initializeInviteForm();
  }

  private initializeInviteForm(): void {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private isEmployee(user: any): boolean {
    const role = `${user?.role ?? ''}`.toString().trim().toLowerCase();
    return role === 'employee';
  }

  // Get the title based on role and view state
  getPageTitle(): string {
    const userRole = this.auth.role();
    
    if (userRole === 'admin') {
      if (this.viewingCompanyEmployees()) {
        return `Employees of ${this.selectedCompany()?.fullName || 'Company'}`;
      }
      return 'Companies';
    } else if (userRole === 'company') {
      return 'Employees';
    }
    return 'Users';
  }

  // Get the subtitle based on role and view state
  getPageSubtitle(): string {
    const userRole = this.auth.role();
    
    if (userRole === 'admin') {
      if (this.viewingCompanyEmployees()) {
        return 'View and manage employees of this company';
      }
      return 'Click on a company to view their employees';
    } else if (userRole === 'company') {
      return 'Manage employee users from your organization';
    }
    return 'Manage users from one place';
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'invited':
        return 'bg-warning-subtle text-warning-emphasis';
      case 'joined':
        return 'bg-info-subtle text-info-emphasis';
      case 'active':
        return 'bg-success-subtle text-success-emphasis';
      case 'inactive':
        return 'bg-secondary-subtle text-secondary-emphasis';
      default:
        return 'bg-secondary-subtle text-secondary-emphasis';
    }
  }

  // Get status display text
  getStatusText(status: string): string {
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  // Check if user can create users (admin only)
  canCreateUsers(): boolean {
    return this.auth.role() === 'admin';
  }

  // Check if user can invite (company only)
  canInviteUsers(): boolean {
    return this.auth.role() === 'company';
  }

  loadUsers(): void {

    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          const users = Array.isArray(response?.data)
            ? response.data
            : [];

          this.users.set(users);

        },

        error: (err) =>
          console.error(err)

      });

  }

  /**
   * Load employees of a specific company (Admin only)
   */
  loadEmployeesByCompany(companyId: string): void {
    this.userService
      .getEmployeesByCompany(companyId)
      .subscribe({
        next: (response) => {
          const employees = Array.isArray(response?.data)
            ? response.data
            : [];

          this.users.set(employees);
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Failed to load employees');
        }
      });
  }

  /**
   * View company's employees (Admin only)
   */
  viewCompanyEmployees(company: any): void {
    if (this.auth.role() !== 'admin') {
      return;
    }

    this.selectedCompany.set(company);
    this.viewingCompanyEmployees.set(true);
    this.loadEmployeesByCompany(company._id);
  }

  /**
   * Go back to companies list (Admin only)
   */
  backToCompanies(): void {
    this.viewingCompanyEmployees.set(false);
    this.selectedCompany.set(null);
    this.loadUsers();
  }

  /**
   * Check if currently viewing companies (Admin in main view)
   */
  isViewingCompanies(): boolean {
    return this.auth.role() === 'admin' && !this.viewingCompanyEmployees();
  }

  /**
   * Check if currently viewing employees of a company
   */
  isViewingCompanyEmployees(): boolean {
    return this.auth.role() === 'admin' && this.viewingCompanyEmployees();
  }

  /**
   * Open invite modal
   */
  openInviteModal(): void {
    this.showInviteModal = true;
    this.inviteForm.reset();
    this.inviteError = '';
    this.inviteSuccess = '';
  }

  /**
   * Close invite modal
   */
  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteForm.reset();
    this.inviteError = '';
    this.inviteSuccess = '';
  }

  /**
   * Send invite
   */
  sendInvite(): void {
    if (this.inviteForm.invalid) {
      return;
    }

    this.isInviting = true;
    this.inviteError = '';
    this.inviteSuccess = '';

    const email = this.inviteForm.get('email')?.value;

    this.userService.inviteUser({ email }).subscribe({
      next: (response) => {
        this.isInviting = false;
        this.inviteSuccess = `Invitation sent successfully to ${email}`;
        this.loadUsers(); // Refresh user list
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeInviteModal();
        }, 2000);
      },
      error: (error) => {
        this.isInviting = false;
        this.inviteError = error.error?.message || 'Failed to send invitation. Please try again.';
      }
    });
  }

  viewUser(user: any): void { }

  editUser(user: any): void {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;

    this.router.navigate([
      `${basePath}/users`,
      user._id,
      'edit'
    ]);

  }

  deleteUser(user: any): void {

    this.alertService.confirmDelete(user.fullName).then((confirmed) => {
      if (confirmed) {
        this.userService.deleteUser(user._id).subscribe({
          next: () => {
            this.loadUsers();
            this.alertService.toast('User deleted successfully', 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to delete user. Please try again.');
          }
        });
      }
    });

  }

}