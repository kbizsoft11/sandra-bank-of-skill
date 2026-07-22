import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService, Role } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';
import { Router, RouterLink } from '@angular/router';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { TableColDirective } from '../../../shared/data-table/table-col.directive';
import { TableColumn } from '../../../shared/data-table/table-column.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TableActions, DataTableComponent, TableColDirective],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly users = signal<any[]>([]);
  readonly isLoading = signal<boolean>(false);
  totalItems = 0;
  serverPage = 1;
  serverPageSize = 10;
  serverSortKey: string | null = null;
  serverSortDir: 'asc' | 'desc' | null = null;
  serverSearchTerm = '';
  readonly availableRoles = signal<Role[]>([]);
  readonly activeTab = signal<'invited' | 'joined'>('joined');

  // For admin hierarchy view
  readonly viewingCompanyEmployees = signal<boolean>(false);
  readonly selectedCompany = signal<any | null>(null);

  // Filtered users based on role and view state
  readonly displayedUsers = computed(() => {
    const userRole = this.auth.role();
    let filteredUsers = this.users();

    if (userRole === 'admin') {
      if (this.viewingCompanyEmployees()) {
        filteredUsers = this.users();
      } else {
        filteredUsers = this.users();
      }
    } else if (userRole === 'company') {
      filteredUsers = this.users().filter((user: any) => this.isEmployee(user));
      filteredUsers = filteredUsers.filter((user: any) => this.matchesActiveTab(user));
    }

    return filteredUsers;
  });

  // Invite modal state
  showInviteModal = false;
  inviteForm!: FormGroup;
  isInviting = false;
  inviteError = '';
  inviteSuccess = '';

  // Data table columns
  readonly columns: TableColumn[] = [
    { key: 'fullName', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role' },
    { key: 'accountStatus', header: 'Status' },
    { key: 'actions', header: 'Actions', align: 'end', width: '240px' },
  ];

  ngOnInit(): void {
    // Use server-side listing for company users (supports pagination/search/sort)
    if (this.auth.role() === 'company') {
      this.fetchPage();
    } else {
      this.loadUsers();
    }
    this.initializeInviteForm();
    // Load roles if user is a company
    if (this.auth.role() === 'company') {
      this.loadRoles();
    }
  }

  private initializeInviteForm(): void {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      designationId: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    });
  }

  private loadRoles(): void {
    this.roleService.getRoles(true).subscribe({
      next: (response) => {
        this.availableRoles.set(response.data || []);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      },
    });
  }

  private isEmployee(user: any): boolean {
    const role = `${user?.role ?? ''}`.toString().trim().toLowerCase();
    return role === 'employee';
  }

  private matchesActiveTab(user: any): boolean {
    const status = `${user?.accountStatus ?? ''}`.toString().trim().toLowerCase();

    if (this.activeTab() === 'invited') {
      return status === 'invited';
    }

    return status === 'joined' || status === 'active' || status === 'inactive' || status === '';
  }

  setActiveTab(tab: 'invited' | 'joined'): void {
    this.activeTab.set(tab);
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
    this.userService.getUsers().subscribe({
      next: (response) => {
        const users = Array.isArray(response?.data) ? response.data : [];

        this.users.set(users);
      },

      error: (err) => console.error(err),
    });
  }


  private fetchPage(): void {
    this.isLoading.set(true);

    this.userService
      .searchEmployees({
        search: this.serverSearchTerm || undefined,
        page: this.serverPage,
        limit: this.serverPageSize,
        sortKey: this.serverSortKey || undefined,
        sortDirection: this.serverSortDir || undefined,
      })
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          const data = response?.data;
          const employees = Array.isArray(data?.employees) ? data.employees : [];
          this.users.set(employees);
          this.totalItems = data?.pagination?.total ?? 0;
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error fetching employees', err);
        },
      });
  }

  onSearch(term: string): void {
    this.serverSearchTerm = term;
    this.serverPage = 1;
    this.fetchPage();
  }

  onSort(event: { key: string; direction: 'asc' | 'desc' | null }): void {
    this.serverSortKey = event.direction ? event.key : null;
    this.serverSortDir = event.direction as any;
    this.serverPage = 1;
    this.fetchPage();
  }

  onPage(page: number): void {
    this.serverPage = page;
    this.fetchPage();
  }

  onPageSize(size: number): void {
    this.serverPageSize = size;
    this.serverPage = 1;
    this.fetchPage();
  }
  /**
   * Load employees of a specific company (Admin only)
   */
  loadEmployeesByCompany(companyId: string): void {
    this.userService.getEmployeesByCompany(companyId).subscribe({
      next: (response) => {
        const employees = Array.isArray(response?.data) ? response.data : [];

        this.users.set(employees);
      },
      error: (err) => {
        console.error(err);
        this.alertService.error('Failed to load employees');
      },
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
    // Reload roles to get the latest
    if (this.auth.role() === 'company') {
      this.loadRoles();
    }
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
    const designationId = this.inviteForm.get('designationId')?.value;
    const message = this.inviteForm.get('message')?.value;

    // Always invite as employee with selected designation
    const payload = {
      email,
      role: 'employee',
      designationId,
      message,
    };

    this.userService.inviteUser(payload).subscribe({
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
      },
    });
  }

  viewUser(user: any): void {
    this.viewUserProfile(user);
  }

  viewUserProfile(user: any): void {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;

    this.router.navigate([`${basePath}/users`, user._id, 'profile']);
  }

  loginAsEmployee(user: any): void {
    this.alertService
      .confirm(
        `You are about to login as ${user.fullName}. This will open a separate employee session in a new tab.`,
        'Continue as employee?',
        'Continue',
        'Cancel',
      )
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.userService.impersonateUser(user._id).subscribe({
          next: (response) => {
            const token = response.data?.token;
            if (!token) {
              this.alertService.error('Unable to login as employee. No token was returned.');
              return;
            }

            this.auth.prepareImpersonationSession(token, false);

            const url = this.router.serializeUrl(
              this.router.createUrlTree(['/employee/dashboard'], {
                queryParams: { impersonation: 'true' },
              }),
            );
            window.open(url, '_blank');

            this.alertService.toast(`Logged in as ${user.fullName}`, 'success');
          },
          error: (error) => {
            this.alertService.error(
              error.error?.message || 'Failed to login as employee. Please try again.',
            );
          },
        });
      });
  }

  toggleEmployeeStatus(user: any): void {
    const action = user.isActive ? 'Deactivate' : 'Activate';

    this.alertService
      .confirm(
        `${action} ${user.fullName}?`,
        `This will ${user.isActive ? 'deactivate' : 'activate'} the employee account.`,
        `${action} now`,
        'Cancel',
      )
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.userService.setEmployeeStatus(user._id, !user.isActive).subscribe({
          next: () => {
            this.alertService.toast(`Employee ${action.toLowerCase()}d successfully`, 'success');
            this.loadUsers();
          },
          error: (error) => {
            this.alertService.error(
              error.error?.message ||
                `Failed to ${action.toLowerCase()} employee. Please try again.`,
            );
          },
        });
      });
  }

  viewUserSkills(user: any): void {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;

    this.router.navigate([`${basePath}/users`, user._id, 'skills']);
  }

  editUser(user: any): void {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;

    this.router.navigate([`${basePath}/users`, user._id, 'edit']);
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
          },
        });
      }
    });
  }
}
