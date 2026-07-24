import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { AlertService } from '../../../core/services/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './company-details.html',
  styleUrl: './company-details.scss',
})
export class CompanyDetails implements OnInit {

  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly company = signal<any | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly exportingExcel = signal(false);
  readonly exportingCSV = signal(false);

  ngOnInit(): void {
    this.loadCompanyDetails();
  }

  loadCompanyDetails(): void {
    const companyId = this.route.snapshot.paramMap.get('id');

    if (!companyId) {
      this.error.set('Company ID not found');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.companyService.getCompanyDetails(companyId).subscribe({
      next: (response) => {
        console.log('Company details response:', response);
        if (response?.data) {
          // Response structure: { success: true, message: string, data: company }
          const companyData = response.data;
          if (companyData) {
            this.company.set(companyData);
          } else {
            this.error.set('Company data not found in response');
          }
        } else {
          this.error.set('Invalid response format');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading company details:', err);
        this.error.set(err?.error?.message || 'Failed to load company details');
        this.alertService.error(err?.error?.message || 'Failed to load company details');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/companies']);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getStatusBadgeClass(status: boolean): string {
    return status ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(status: boolean): string {
    return status ? 'Active' : 'Inactive';
  }

  exportDataAsExcel(): void {
    const companyId = this.company()?._id;
    if (!companyId) {
      this.alertService.error('Company ID not found');
      return;
    }

    if (this.exportingExcel()) {
      return; // Prevent multiple clicks
    }

    this.exportingExcel.set(true);
    this.companyService.exportCompanyDataExcel(companyId).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `company-data-${this.company()?.fullName || 'export'}.xlsx`);
        this.alertService.success('Company data exported successfully');
        this.exportingExcel.set(false);
      },
      error: (err) => {
        console.error('Error exporting company data:', err);
        this.alertService.error('Failed to export company data');
        this.exportingExcel.set(false);
      },
    });
  }

  exportDataAsCSV(): void {
    const companyId = this.company()?._id;
    if (!companyId) {
      this.alertService.error('Company ID not found');
      return;
    }

    if (this.exportingCSV()) {
      return; // Prevent multiple clicks
    }

    this.exportingCSV.set(true);
    this.companyService.exportCompanyDataCSV(companyId).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `company-data-${this.company()?.fullName || 'export'}.csv`);
        this.alertService.success('Company data exported successfully');
        this.exportingCSV.set(false);
      },
      error: (err) => {
        console.error('Error exporting company data:', err);
        this.alertService.error('Failed to export company data');
        this.exportingCSV.set(false);
      },
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
