import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssessmentService } from '../../core/services/assessment.service';
import { CompanyService } from '../../core/services/company.service';
import { AdminPrismReportRow } from '../../shared/interfaces/assessment.interface';

@Component({
  selector: 'app-admin-prism-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-prism-reports.html',
  styleUrl: './admin-prism-reports.scss',
})
export class AdminPrismReports implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);

  readonly reports = signal<AdminPrismReportRow[]>([]);
  readonly companies = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly search = signal('');
  readonly selectedCompany = signal('');

  ngOnInit(): void {
    this.loadCompanies();
    this.loadReports();
  }

  loadCompanies(): void {
    this.companyService.getAllCompanies({ page: 1, limit: 100, status: 'active' }).subscribe({
      next: (response: any) => this.companies.set(response?.data?.companies || []),
    });
  }

  loadReports(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.assessmentService.getAdminPrismReports({
      page,
      limit: 10,
      search: this.search(),
      organisationId: this.selectedCompany(),
    }).subscribe({
      next: (response) => {
        const data = response.data;
        this.reports.set(data?.reports || []);
        this.page.set(data?.pagination?.page || page);
        this.totalPages.set(Math.max(data?.pagination?.totalPages || 1, 1));
        this.total.set(data?.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Unable to load PRISM reports.');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadReports(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedCompany.set('');
    this.applyFilters();
  }

  viewReport(report: AdminPrismReportRow): void {
    if (!report.hasAssessment) return;
    this.router.navigate(['/admin/prism-report', report.employeeId], {
      queryParams: { name: report.fullName },
    });
  }

  previousPage(): void {
    if (this.page() > 1) this.loadReports(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.loadReports(this.page() + 1);
  }

  statusLabel(status: AdminPrismReportRow['reportStatus']): string {
    return ({
      not_assigned: 'Not assigned',
      assigned: 'Ready to take',
      completed: 'Completed',
      unlocked: 'Report available',
    } as Record<string, string>)[status] || 'Unknown';
  }

  statusClass(status: AdminPrismReportRow['reportStatus']): string {
    return ({
      not_assigned: 'status-gray',
      assigned: 'status-blue',
      completed: 'status-orange',
      unlocked: 'status-green',
    } as Record<string, string>)[status] || 'status-gray';
  }
}
