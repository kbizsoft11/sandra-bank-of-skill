import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService, Role } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Router, RouterLink } from '@angular/router';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { TableColDirective } from '../../../shared/data-table/table-col.directive';
import { TableColumn } from '../../../shared/data-table/table-column.model';
import { SkillService } from '../../../core/services/skill.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, DataTableComponent, TableColDirective],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly skillService = inject(SkillService);
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

  // Filter states
  readonly departments = signal<any[]>([]);
  readonly teams = signal<any[]>([]);
  readonly jobRoles = signal<any[]>([]);
  readonly showFilters = signal<boolean>(false);
  selectedDepartment = '';
  selectedTeam = '';
  selectedJobRole = '';
  selectedStatus = '';

  // Bulk operations
  selectedEmployees = new Set<string>();
  showBulkUpdateModal = false;
  bulkUpdateForm!: FormGroup;
  isBulkUpdating = false;
  bulkUpdateError = '';
  bulkUpdateSuccess = '';

  // Import/Export
  showImportModal = false;
  importFile: File | null = null;
  isImporting = false;
  importError = '';
  importSuccess = '';
  isExporting = false;

  // Activity tracking
  showActivityModal = false;
  selectedEmployee: any = null;
  activityType: 'login' | 'course' | 'assessment' | 'skill' | 'recent' = 'login';
  employeeActivities = signal<any[]>([]);
  isLoadingActivities = signal<boolean>(false);

  // Assign Skills Modal
  showAssignSkillsModal = false;
  selectedEmployeeForSkills: any = null;
  skillSearchTerm = '';
  allSkills = signal<any[]>([]);
  filteredSkills = signal<any[]>([]);
  selectedSkillsForEmployee = signal<string[]>([]);
  skillScoresAndLevels = signal<{ [skillId: string]: { score: number; level: string } }>({});
  isAssigningSkills = false;
  assignSkillsError = '';

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
  readonly columns: TableColumn[] = [];

  ngOnInit(): void {
    // Initialize columns based on role
    this.initializeColumns();
    
    // Use server-side listing for company users (supports pagination/search/sort)
    if (this.auth.role() === 'company') {
      this.fetchPage();
      this.loadFilterOptions();
    } else {
      this.loadUsers();
    }
    this.initializeInviteForm();
    this.initializeBulkUpdateForm();
    // Load roles if user is a company
    if (this.auth.role() === 'company') {
      this.loadRoles();
    }
  }

  private initializeColumns(): void {
    const baseColumns: TableColumn[] = [];

    // Add select column for company role
    if (this.auth.role() === 'company') {
      baseColumns.push({ key: 'select', header: '', width: '50px' });
    }

    baseColumns.push(
      { key: 'fullName', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'role', header: 'Designation' },
      { key: 'accountStatus', header: 'Status' },
      { key: 'actions', header: 'Actions', align: 'end', width: '240px' }
    );

    this.columns.push(...baseColumns);
  }

  private initializeBulkUpdateForm(): void {
    this.bulkUpdateForm = this.fb.group({
      department: [''],
      team: [''],
      jobRole: [''],
      status: [''],
    });
  }

  private loadFilterOptions(): void {
    // Load departments
    this.userService.getDepartments().subscribe({
      next: (response) => {
        this.departments.set(response.data || []);
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      },
    });

    // Load teams
    this.userService.getTeams().subscribe({
      next: (response) => {
        this.teams.set(response.data || []);
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      },
    });

    // Load job roles from RoleService (organization roles only)
    this.roleService.getRoles(true).subscribe({
      next: (response) => {
        const roles = Array.isArray(response?.data) ? response.data : response.data?.roles || [];
        this.jobRoles.set(roles.map((role: any) => ({
          _id: role._id,
          name: role.designationName
        })));
      },
      error: (error) => {
        console.error('Error loading job roles:', error);
      },
    });
  }

  readonly defaultInviteMessage = 'Hello! You are invited to join our team on Bank of Skill. Please click the invitation link to set up your password and complete your profile setup and skill questionnaires: {{INVITE_LINK}}';

  private initializeInviteForm(): void {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      designationId: ['', [Validators.required]],
      message: [this.defaultInviteMessage, [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
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
    this.serverPage = 1;
    this.fetchPage();
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  applyFilters(): void {
    this.serverPage = 1;
    this.fetchPage();
  }

  clearFilters(): void {
    this.selectedDepartment = '';
    this.selectedTeam = '';
    this.selectedJobRole = '';
    this.selectedStatus = '';
    this.applyFilters();
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

        this.userService
          .getUsers(1, 100)
          .subscribe({

            next: (response) => {

              // Handle paginated response format
              let users: any[] = [];

              if (response?.data?.users && Array.isArray(response.data.users)) {
                users = response.data.users;
              } else if (Array.isArray(response?.data)) {
                users = response.data;
              }

              this.users.set(users);

            },

            error: (err) => {
              console.error(err);
              this.alertService.error('Failed to load users');
            }

          });
      },
      error: (err) => console.error(err),
    });
  }


  private fetchPage(): void {
    this.isLoading.set(true);

    // Determine account status based on active tab
    const accountStatus = this.activeTab() === 'invited' ? 'invited' : undefined;

    this.userService
      .searchEmployees({
        search: this.serverSearchTerm || undefined,
        department: this.selectedDepartment || undefined,
        team: this.selectedTeam || undefined,
        jobRole: this.selectedJobRole || undefined,
        status: this.selectedStatus || undefined,
        accountStatus: accountStatus,
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
    this.inviteForm.reset({ message: this.defaultInviteMessage });
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
    this.inviteForm.reset({ message: this.defaultInviteMessage });
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

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  toggleEmployeeSelection(employeeId: string): void {
    if (this.selectedEmployees.has(employeeId)) {
      this.selectedEmployees.delete(employeeId);
    } else {
      this.selectedEmployees.add(employeeId);
    }
  }

  isEmployeeSelected(employeeId: string): boolean {
    return this.selectedEmployees.has(employeeId);
  }

  toggleSelectAll(): void {
    if (this.selectedEmployees.size === this.users().length) {
      this.selectedEmployees.clear();
    } else {
      this.users().forEach(user => this.selectedEmployees.add(user._id));
    }
  }

  get allSelected(): boolean {
    return this.users().length > 0 && this.selectedEmployees.size === this.users().length;
  }

  openBulkUpdateModal(): void {
    if (this.selectedEmployees.size === 0) {
      this.alertService.error('Please select at least one employee');
      return;
    }
    this.showBulkUpdateModal = true;
    this.bulkUpdateForm.reset();
    this.bulkUpdateError = '';
    this.bulkUpdateSuccess = '';
  }

  closeBulkUpdateModal(): void {
    this.showBulkUpdateModal = false;
    this.bulkUpdateForm.reset();
    this.bulkUpdateError = '';
    this.bulkUpdateSuccess = '';
  }

  bulkUpdate(): void {
    if (this.bulkUpdateForm.invalid) {
      return;
    }

    const updates: any = {};
    const formValue = this.bulkUpdateForm.value;

    if (formValue.department) updates.department = formValue.department;
    if (formValue.team) updates.team = formValue.team;
    if (formValue.jobRole) updates.jobRole = formValue.jobRole;
    if (formValue.status) updates.status = formValue.status;

    if (Object.keys(updates).length === 0) {
      this.bulkUpdateError = 'Please select at least one field to update';
      return;
    }

    this.isBulkUpdating = true;
    this.bulkUpdateError = '';
    this.bulkUpdateSuccess = '';

    this.userService.bulkUpdateEmployees({
      employeeIds: Array.from(this.selectedEmployees),
      updates
    }).subscribe({
      next: () => {
        this.isBulkUpdating = false;
        this.bulkUpdateSuccess = `Successfully updated ${this.selectedEmployees.size} employee(s)`;
        this.selectedEmployees.clear();
        this.fetchPage();

        setTimeout(() => {
          this.closeBulkUpdateModal();
        }, 2000);
      },
      error: (error) => {
        this.isBulkUpdating = false;
        this.bulkUpdateError = error.error?.message || 'Failed to update employees. Please try again.';
      },
    });
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  openImportModal(): void {
    this.showImportModal = true;
    this.importFile = null;
    this.importError = '';
    this.importSuccess = '';
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.importFile = null;
    this.importError = '';
    this.importSuccess = '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(file.type)) {
        this.importError = 'Please select a valid CSV or Excel file';
        this.importFile = null;
        return;
      }
      this.importFile = file;
      this.importError = '';
    }
  }

  importEmployees(): void {
    if (!this.importFile) {
      this.importError = 'Please select a file to import';
      return;
    }

    this.isImporting = true;
    this.importError = '';
    this.importSuccess = '';

    this.userService.importEmployees(this.importFile).subscribe({
      next: (response) => {
        this.isImporting = false;
        this.importSuccess = response.message || 'Employees imported successfully';
        this.fetchPage();

        setTimeout(() => {
          this.closeImportModal();
        }, 2000);
      },
      error: (error) => {
        this.isImporting = false;
        this.importError = error.error?.message || 'Failed to import employees. Please try again.';
      },
    });
  }

  exportEmployees(): void {
    this.isExporting = true;
    const accountStatus = this.activeTab() === 'invited' ? 'invited' : undefined;

    this.userService.exportEmployees({
      search: this.serverSearchTerm || undefined,
      department: this.selectedDepartment || undefined,
      team: this.selectedTeam || undefined,
      jobRole: this.selectedJobRole || undefined,
      status: this.selectedStatus || undefined,
      accountStatus,
    }).subscribe({
      next: (blob) => {
        this.isExporting = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.alertService.toast('Employee list exported successfully', 'success');
      },
      error: (error) => {
        this.isExporting = false;
        this.alertService.error(error.error?.message || 'Failed to export employees. Please try again.');
      },
    });
  }

  downloadTemplate(): void {
    // Create a sample CSV template
    const headers = ['Email', 'Full Name', 'Department', 'Team', 'Job Role'];
    const sampleRow = ['employee@example.com', 'John Doe', 'Engineering', 'Backend', 'Software Engineer'];
    const csvContent = [headers, sampleRow].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ============================================================================
  // Activity Tracking
  // ============================================================================

  viewEmployeeActivities(employee: any): void {
    this.selectedEmployee = employee;
    this.activityType = 'login';
    this.showActivityModal = true;
    this.loadActivities();
  }

  closeActivityModal(): void {
    this.showActivityModal = false;
    this.selectedEmployee = null;
    this.employeeActivities.set([]);
  }

  setActivityType(type: 'login' | 'course' | 'assessment' | 'skill' | 'recent'): void {
    this.activityType = type;
    this.loadActivities();
  }

  loadActivities(): void {
    if (!this.selectedEmployee) return;

    this.isLoadingActivities.set(true);
    this.employeeActivities.set([]);

    if (this.activityType === 'login') {
      this.userService.getLoginHistory(this.selectedEmployee._id).subscribe({
        next: (response) => {
          this.isLoadingActivities.set(false);
          this.employeeActivities.set(response.data || []);
        },
        error: (error) => {
          this.isLoadingActivities.set(false);
          console.error('Error loading login history:', error);
        },
      });
    } else {
      this.userService.getEmployeeActivities(this.selectedEmployee._id, this.activityType).subscribe({
        next: (response) => {
          this.isLoadingActivities.set(false);
          this.employeeActivities.set(response.data || []);
        },
        error: (error) => {
          this.isLoadingActivities.set(false);
          console.error('Error loading activities:', error);
        },
      });
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'login': return 'bi-box-arrow-in-right';
      case 'course': return 'bi-book';
      case 'assessment': return 'bi-clipboard-check';
      case 'skill': return 'bi-star';
      case 'recent': return 'bi-clock-history';
      default: return 'bi-activity';
    }
  }

  openAssignSkillsModal(employee: any): void {
    this.selectedEmployeeForSkills = employee;
    this.showAssignSkillsModal = true;
    this.skillSearchTerm = '';
    this.selectedSkillsForEmployee.set([]);
    this.skillScoresAndLevels.set({});
    this.assignSkillsError = '';
    
    // Load company created skills (non-archived only)
    this.skillService.getSkills({ limit: '1000', archived: 'false' }).subscribe({
      next: (response: any) => {
        const companySkills = (response.data?.skills || response.data || []).filter((s: any) => !s.archived);
        
        this.allSkills.set(companySkills);
        this.filteredSkills.set(companySkills);
        
        // Load already assigned skills for this employee
        this.loadEmployeeSkills(employee._id);
      },
      error: () => {
        this.assignSkillsError = 'Failed to load skills';
      }
    });
  }

  closeAssignSkillsModal(): void {
    this.showAssignSkillsModal = false;
    this.selectedEmployeeForSkills = null;
    this.selectedSkillsForEmployee.set([]);
  }

  filterSkills(): void {
    const term = this.skillSearchTerm.toLowerCase();
    const allSkills = this.allSkills();
    
    if (!term) {
      this.filteredSkills.set(allSkills);
    } else {
      this.filteredSkills.set(allSkills.filter(skill => 
        skill.name.toLowerCase().includes(term) || 
        (skill.category?.name?.toLowerCase().includes(term))
      ));
    }
  }

  isSkillSelected(skillId: string): boolean {
    return this.selectedSkillsForEmployee().includes(skillId);
  }

  toggleSkillSelection(skillId: string): void {
    const selected = [...this.selectedSkillsForEmployee()];
    const index = selected.indexOf(skillId);
    
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(skillId);
    }
    
    this.selectedSkillsForEmployee.set(selected);
  }

  getSkillName(skillId: string): string {
    const skill = this.allSkills().find(s => s._id === skillId);
    return skill?.name || 'Unknown Skill';
  }

  getSkillScore(skillId: string): number {
    return this.skillScoresAndLevels()[skillId]?.score || 0;
  }

  setSkillScore(skillId: string, score: string | number): void {
    const scoreNum = parseInt(score.toString());
    const current = this.skillScoresAndLevels();
    current[skillId] = {
      score: Math.min(100, Math.max(0, scoreNum)),
      level: current[skillId]?.level || 'beginner'
    };
    this.skillScoresAndLevels.set({ ...current });
  }

  getSkillLevel(skillId: string): string {
    return this.skillScoresAndLevels()[skillId]?.level || 'beginner';
  }

  setSkillLevel(skillId: string, event: any): void {
    const level = event.target?.value || event;
    const current = this.skillScoresAndLevels();
    current[skillId] = {
      score: current[skillId]?.score || 0,
      level: level
    };
    this.skillScoresAndLevels.set({ ...current });
  }

  loadEmployeeSkills(employeeId: string): void {
    this.userService.getEmployeeSkills(employeeId).subscribe({
      next: (response: any) => {
        const skills = response.data || [];
        const skillIds = skills.map((s: any) => s.skillId?._id || s.skillId || s._id);
        this.selectedSkillsForEmployee.set(skillIds);
        
        // Populate score and level for each assigned skill
        const scoresAndLevels: { [skillId: string]: { score: number; level: string } } = {};
        
        // Also merge skill details from the response if available
        const allSkillsMap = new Map(this.allSkills().map(s => [s._id, s]));
        
        skills.forEach((s: any) => {
          const skillId = s.skillId?._id || s.skillId || s._id;
          scoresAndLevels[skillId] = {
            score: s.score || 0,
            level: s.level || 'beginner'
          };
          
          // Add skill details to allSkills if not already there
          if (!allSkillsMap.has(skillId) && s.skillId) {
            // If skillId is populated (has name property), add it
            if (typeof s.skillId === 'object' && s.skillId.name) {
              allSkillsMap.set(skillId, {
                _id: skillId,
                name: s.skillId.name,
                category: s.skillId.categoryId
              });
            }
          }
        });
        
        this.skillScoresAndLevels.set(scoresAndLevels);
        this.allSkills.set(Array.from(allSkillsMap.values()));
      },
      error: () => {
        console.error('Failed to load employee skills');
      }
    });
  }

  assignSkillsToEmployee(): void {
    this.isAssigningSkills = true;
    this.assignSkillsError = '';

    // Build array of skills with score and level
    const skillsWithScoresAndLevels = this.selectedSkillsForEmployee().map(skillId => ({
      skillId: skillId,
      score: this.getSkillScore(skillId),
      level: this.getSkillLevel(skillId)
    }));

    const payload = {
      employeeId: this.selectedEmployeeForSkills._id,
      skills: skillsWithScoresAndLevels
    };

    this.userService.assignSkillsToEmployee(payload).subscribe({
      next: () => {
        this.isAssigningSkills = false;
        this.alertService.success('Skills assigned successfully');
        this.closeAssignSkillsModal();
      },
      error: (error) => {
        this.isAssigningSkills = false;
        this.assignSkillsError = error?.error?.message || 'Failed to assign skills';
      }
    });
  }
}
