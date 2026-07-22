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

@Component({
  selector: 'app-organisation-employees',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
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
  readonly pageSize = signal(20);
  readonly totalEmployees = signal(0);

  // Filters
  readonly searchForm = signal<FormGroup | null>(null);
  readonly selectedStatus = signal<string>('');

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
    this.router.navigate(['/admin/companies']);
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
