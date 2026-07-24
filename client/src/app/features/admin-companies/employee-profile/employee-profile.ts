import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.scss',
})
export class EmployeeProfile implements OnInit {

  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly employee = signal<any | null>(null);
  readonly skills = signal<any[]>([]);
  readonly assessments = signal<any[]>([]);
  readonly activities = signal<any[]>([]);
  
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  
  readonly employeeId = signal<string | null>(null);
  readonly organisationId = signal<string | null>(null);
  readonly activeTab = signal<'overview' | 'skills' | 'assessments' | 'activity'>('overview');

  ngOnInit(): void {
    const empId = this.route.snapshot.paramMap.get('employeeId');
    const orgId = this.route.snapshot.paramMap.get('organisationId');
    if (empId) {
      this.employeeId.set(empId);
      this.organisationId.set(orgId);
      this.loadEmployeeProfile();
      this.loadEmployeeSkills();
      this.loadEmployeeAssessments();
      this.loadEmployeeActivity();
    } else {
      this.error.set('Employee ID not found');
    }
  }

  getDesignationName(designationId: string, designationName?: string): string {
    if (designationName) {
      return designationName;
    }
    if (!designationId) return '-';
    return designationId;
  }

  loadEmployeeProfile(): void {
    if (!this.employeeId()) return;

    this.loading.set(true);
    this.error.set(null);

    this.companyService.getEmployeeDetails(this.employeeId()!).subscribe({
      next: (response) => {
        if (response?.data) {
          this.employee.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading employee profile:', err);
        this.error.set('Failed to load employee profile');
        this.alertService.error('Failed to load employee profile');
        this.loading.set(false);
      },
    });
  }

  loadEmployeeSkills(): void {
    if (!this.employeeId()) return;

    this.companyService.getEmployeeSkills(this.employeeId()!).subscribe({
      next: (response) => {
        if (response?.data) {
          this.skills.set(response.data || []);
        }
      },
      error: (err) => {
        console.error('Error loading employee skills:', err);
        // Don't show error alert, just log it
      },
    });
  }

  loadEmployeeAssessments(): void {
    if (!this.employeeId()) return;

    this.companyService.getEmployeeAssessments(this.employeeId()!).subscribe({
      next: (response) => {
        if (response?.data) {
          this.assessments.set(response.data || []);
        }
      },
      error: (err) => {
        console.error('Error loading employee assessments:', err);
        // Don't show error alert, just log it
      },
    });
  }

  loadEmployeeActivity(): void {
    if (!this.employeeId()) return;

    this.companyService.getEmployeeActivity(this.employeeId()!).subscribe({
      next: (response) => {
        if (response?.data) {
          this.activities.set(response.data || []);
        }
      },
      error: (err) => {
        console.error('Error loading employee activity:', err);
        // Don't show error alert, just log it
      },
    });
  }

  setActiveTab(tab: 'overview' | 'skills' | 'assessments' | 'activity'): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    const organisationId = this.organisationId();
    if (organisationId) {
      this.router.navigate(['/admin/organisation', organisationId, 'employees']);
    } else {
      this.router.navigate(['/admin/companies']);
    }
  }

  getStatusBadgeClass(status: boolean): string {
    return status ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(status: boolean): string {
    return status ? 'Active' : 'Inactive';
  }

  getProficiencyBadgeClass(level: string): string {
    switch (level?.toLowerCase()) {
      case 'expert':
        return 'bg-success-subtle text-success-emphasis';
      case 'proficient':
        return 'bg-info-subtle text-info-emphasis';
      case 'intermediate':
        return 'bg-warning-subtle text-warning-emphasis';
      case 'beginner':
        return 'bg-secondary-subtle text-secondary-emphasis';
      default:
        return 'bg-light text-dark';
    }
  }

  getAssessmentStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'passed':
        return 'bg-success-subtle text-success-emphasis';
      case 'pending':
        return 'bg-warning-subtle text-warning-emphasis';
      case 'failed':
        return 'bg-danger-subtle text-danger-emphasis';
      case 'in progress':
        return 'bg-info-subtle text-info-emphasis';
      default:
        return 'bg-light text-dark';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: string | Date): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
