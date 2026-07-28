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
  selector: 'app-employee-skills',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './employee-skills.html',
  styleUrl: './employee-skills.scss',
})
export class EmployeeSkills implements OnInit {

  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly skills = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly employeeId = signal<string | null>(null);
  readonly organisationId = signal<string | null>(null);
  readonly employeeName = signal<string>('Employee');

  ngOnInit(): void {
    const empId = this.route.snapshot.paramMap.get('employeeId');
    const orgId = this.route.snapshot.paramMap.get('organisationId');
    if (empId) {
      this.employeeId.set(empId);
      this.organisationId.set(orgId);
      this.loadEmployeeSkills();
    } else {
      this.error.set('Employee ID not found');
    }
  }

  loadEmployeeSkills(): void {
    if (!this.employeeId()) return;

    this.loading.set(true);
    this.error.set(null);

    this.companyService.getEmployeeSkills(this.employeeId()!).subscribe({
      next: (response) => {
        if (response?.data) {
          this.skills.set(response.data || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading employee skills:', err);
        this.error.set('Failed to load employee skills');
        this.alertService.error('Failed to load employee skills');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    const organisationId = this.organisationId();
    if (organisationId) {
      this.router.navigate(['/admin/organisation', organisationId, 'employees']);
    } else {
      this.router.navigate(['/admin/companies']);
    }
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
}
