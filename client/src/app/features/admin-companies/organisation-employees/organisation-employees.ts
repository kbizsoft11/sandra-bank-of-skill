import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { AlertService } from '../../../core/services/alert.service';
import { EmployeeFormComponent } from '../employee-form/employee-form';

@Component({
  selector: 'app-organisation-employees',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    EmployeeFormComponent,
  ],
  templateUrl: './organisation-employees.html',
  styleUrl: './organisation-employees.scss',
})
export class OrganisationEmployees implements OnInit {

  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  readonly employees = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly organisationId = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10); // Changed from 20 to 10 records per page
  readonly totalEmployees = signal(0);

  // Filters
  readonly searchForm = signal<FormGroup | null>(null);
  readonly selectedStatus = signal<string>('');

  // Export state
  readonly isExporting = signal(false);

  // Create/Edit modal state
  readonly showEmployeeModal = signal(false);
  readonly isEditingEmployee = signal(false);
  readonly selectedEmployee = signal<any | null>(null);
  readonly isSubmittingEmployee = signal(false);

  readonly totalPages = computed(() => {
    return Math.ceil(this.totalEmployees() / this.pageSize());
  });

  readonly displayedEmployees = computed(() => {
    return this.employees();
  });

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('organisationId');
    if (orgId) {
      this.organisationId.set(orgId);
      this.initializeForm();
      this.loadEmployees();
    } else {
      this.error.set('Organisation ID not found');
    }
  }

  private initializeForm(): void {
    const form = this.fb.group({
      search: [''],
    });
    this.searchForm.set(form);
  }

  getDesignationName(designationId: string, designationName?: string): string {
    // If backend provided designationName, use it
    if (designationName) {
      return designationName;
    }
    // Otherwise show "-" if no designationId
    if (!designationId) return '-';
    // Fallback to ID if no name available
    return designationId;
  }


  loadEmployees(): void {
    if (!this.organisationId()) return;

    this.loading.set(true);
    this.error.set(null);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchForm()?.get('search')?.value || undefined,
      status: this.selectedStatus() || undefined,
    };

    this.companyService
      .getOrganisationEmployees(this.organisationId()!, params)
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.employees.set(response.data.employees || []);
            this.totalEmployees.set(response.data.pagination?.total || 0);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading employees:', err);
          this.error.set('Failed to load employees');
          this.alertService.error('Failed to load employees');
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadEmployees();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.currentPage.set(1);
    this.loadEmployees();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadEmployees();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  goBack(): void {
    const organisationId = this.organisationId();
    if (organisationId) {
      this.router.navigate(['/admin/companies', organisationId]);
    } else {
      this.router.navigate(['/admin/companies']);
    }
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  exportEmployees(format: 'excel' | 'csv'): void {
    if (!this.organisationId()) {
      this.alertService.error('Organisation ID not found');
      return;
    }

    this.isExporting.set(true);

    const params = {
      search: this.searchForm()?.get('search')?.value || undefined,
      status: this.selectedStatus() || undefined,
    };

    const exportMethod = format === 'excel'
      ? this.companyService.exportEmployeesToExcel(this.organisationId()!, params)
      : this.companyService.exportEmployeesToCSV(this.organisationId()!, params);

    exportMethod.subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        link.download = `employees-${date}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        this.isExporting.set(false);
        this.alertService.success(`Employees exported to ${format.toUpperCase()} successfully`);
      },
      error: (err) => {
        console.error(`Error exporting to ${format}:`, err);
        this.alertService.error(`Failed to export employees to ${format.toUpperCase()}`);
        this.isExporting.set(false);
      },
    });
  }

  // Create/Edit Employee Methods

  openCreateEmployeeModal(): void {
    this.isEditingEmployee.set(false);
    this.selectedEmployee.set(null);
    this.showEmployeeModal.set(true);
  }

  openEditEmployeeModal(employee: any): void {
    this.isEditingEmployee.set(true);
    this.selectedEmployee.set(employee);
    this.showEmployeeModal.set(true);
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal.set(false);
    this.selectedEmployee.set(null);
    this.isEditingEmployee.set(false);
    this.isSubmittingEmployee.set(false);
  }

  onEmployeeFormSubmit(formData: any): void {
    if (!this.organisationId()) {
      this.alertService.error('Organisation ID not found');
      return;
    }

    this.isSubmittingEmployee.set(true);

    const isEditing = this.isEditingEmployee();
    const organisationId = this.organisationId()!;

    if (isEditing) {
      // Update employee
      const employeeId = this.selectedEmployee()?._id;
      this.companyService.updateEmployeeForOrganisation(organisationId, employeeId, formData).subscribe({
        next: (response) => {
          this.alertService.success('Employee updated successfully');
          this.closeEmployeeModal();
          this.loadEmployees();
          this.isSubmittingEmployee.set(false);
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          this.alertService.error(err?.error?.message || 'Failed to update employee');
          this.isSubmittingEmployee.set(false);
        },
      });
    } else {
      // Create new employee
      this.companyService.createEmployeeForOrganisation(organisationId, formData).subscribe({
        next: (response) => {
          this.alertService.success('Employee created successfully');
          this.closeEmployeeModal();
          this.currentPage.set(1);
          this.loadEmployees();
          this.isSubmittingEmployee.set(false);
        },
        error: (err) => {
          console.error('Error creating employee:', err);
          this.alertService.error(err?.error?.message || 'Failed to create employee');
          this.isSubmittingEmployee.set(false);
        },
      });
    }
  }
}
