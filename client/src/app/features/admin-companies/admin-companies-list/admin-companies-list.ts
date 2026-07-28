import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-admin-companies-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './admin-companies-list.html',
  styleUrl: './admin-companies-list.scss',
})
export class AdminCompaniesList implements OnInit {

  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly storageService = inject(StorageService);
  private readonly fb = inject(FormBuilder);

  readonly companies = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);
  readonly totalCompanies = signal(0);

  // Filters
  readonly searchForm = signal<FormGroup | null>(null);
  readonly selectedStatus = signal<string>('');

  readonly totalPages = computed(() => {
    return Math.ceil(this.totalCompanies() / this.pageSize());
  });

  readonly displayedCompanies = computed(() => {
    return this.companies();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadCompanies();
  }

  private initializeForm(): void {
    const form = this.fb.group({
      search: [''],
    });
    this.searchForm.set(form);
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchForm()?.get('search')?.value || undefined,
      status: this.selectedStatus() || undefined,
    };

    this.companyService.getAllCompanies(params).subscribe({
      next: (response) => {
        if (response?.data) {
          this.companies.set(response.data.companies || []);
          this.totalCompanies.set(response.data.pagination?.total || 0);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading companies:', err);
        this.error.set('Failed to load companies');
        this.alertService.error('Failed to load companies');
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCompanies();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.currentPage.set(1);
    this.loadCompanies();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadCompanies();
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

  toggleCompanyStatus(company: any): void {
    const newStatus = !company.isActive;
    const statusText = newStatus ? 'activate' : 'deactivate';

    this.alertService.confirm(
      `Are you sure you want to ${statusText} ${company.fullName}?`,
      `This company will be ${statusText}d.`,
      `Yes, ${statusText}`,
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.companyService.updateCompanyStatus(company._id, newStatus).subscribe({
          next: () => {
            this.alertService.success(`Company ${statusText}d successfully`);
            this.loadCompanies();
          },
          error: (err) => {
            console.error('Error updating company status:', err);
            this.alertService.error(`Failed to ${statusText} company`);
          },
        });
      }
    });
  }

  getStatusBadgeClass(status: boolean): string {
    return status ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(status: boolean): string {
    return status ? 'Active' : 'Inactive';
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  impersonateCompany(company: any): void {
    this.alertService.confirm(
      `Are you sure you want to impersonate ${company.fullName}?`,
      'You will be logged in as this company in a new session while remaining logged in as admin.',
      'Yes, impersonate',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.userService.impersonateCompanyUser(company._id).subscribe({
          next: (response) => {
            if (response?.data?.token && response?.data?.user) {
              // Store the impersonate token using the dedicated method
              // This stores in localStorage so it's accessible from new tab
              this.storageService.setImpersonationToken(response.data.token, false);
              
              // Determine redirect path based on user role
              const userRole = response.data.user.role;
              let redirectPath = '/dashboard'; // default
              
              if (userRole === 'company') {
                redirectPath = '/company/dashboard';
              } else if (userRole === 'employee') {
                redirectPath = '/employee/dashboard';
              } else if (userRole === 'admin') {
                redirectPath = '/admin/dashboard';
              }
              
              this.alertService.success('Impersonation successful! Opening in new session...');
              
              // Open in new window/tab with impersonation flag and dynamic redirect
              const url = `${window.location.origin}${redirectPath}?impersonation=true`;
              window.open(url, '_blank');
            }
          },
          error: (err) => {
            console.error('Error impersonating company:', err);
            this.alertService.error('Failed to impersonate company');
          },
        });
      }
    });
  }
}
