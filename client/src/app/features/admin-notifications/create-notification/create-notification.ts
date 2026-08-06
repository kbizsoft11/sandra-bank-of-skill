import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationType, TargetRecipient } from '../../../core/models/admin-notification.model';

@Component({
  selector: 'app-create-admin-notification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './create-notification.html',
  styleUrl: './create-notification.scss',
})
export class CreateAdminNotificationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(AdminNotificationService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  notificationForm!: FormGroup;
  readonly isSubmitting = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly notificationId = signal<string | null>(null);

  readonly companies = signal<any[]>([]);
  readonly employees = signal<any[]>([]);
  readonly loadingUsers = signal<boolean>(false);

  ngOnInit(): void {
    this.initForm();
    this.checkIfEditing();
  }

  private checkIfEditing(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.notificationId.set(params['id']);
        this.isEditing.set(true);
        this.loadNotification(params['id']);
      }
    });
  }

  private loadNotification(id: string): void {
    this.isLoading.set(true);
    this.notificationService.getById(id).subscribe({
      next: (res) => {
        if (res.data) {
          const notification = res.data;
          this.notificationForm.patchValue({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            targetRecipient: notification.targetRecipient,
            targetCompanyIds: notification.targetCompanyIds || [],
            targetEmployeeIds: notification.targetEmployeeIds || [],
            deliveryMethod: notification.deliveryMethod,
            scheduledAt: notification.scheduledAt,
          });

          // Load users if specific target
          if (notification.targetRecipient === 'specific_company') {
            this.loadCompanies();
          } else if (notification.targetRecipient === 'specific_employee') {
            this.loadEmployees();
          }
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error('Failed to load notification');
        this.isLoading.set(false);
      },
    });
  }

  private initForm(): void {
    const defaultDate = new Date(Date.now() + 3600000);
    const isoLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    this.notificationForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
      type: ['info', [Validators.required]],
      targetRecipient: ['all_companies', [Validators.required]],
      targetCompanyIds: [[]],
      targetEmployeeIds: [[]],
      deliveryMethod: ['now', [Validators.required]],
      scheduledAt: [isoLocal],
    });
  }

  private loadCompanies(): void {
    this.loadingUsers.set(true);
    // Fetch companies - load page 1 with high limit
    this.userService.getUsers(1, 1000).subscribe({
      next: (res) => {
        if (res.data && res.data.users && Array.isArray(res.data.users)) {
          this.companies.set(res.data.users.filter((u: any) => u.role === 'company'));
        } else {
          this.companies.set([]);
        }
        this.loadingUsers.set(false);
      },
      error: () => {
        this.alertService.error('Failed to load companies');
        this.loadingUsers.set(false);
      },
    });
  }

  private loadEmployees(): void {
    this.loadingUsers.set(true);
    // Fetch employees - load page 1 with high limit
    this.userService.getUsers(1, 1000).subscribe({
      next: (res) => {
        if (res.data && res.data.users && Array.isArray(res.data.users)) {
          this.employees.set(res.data.users.filter((u: any) => u.role === 'employee'));
        } else {
          this.employees.set([]);
        }
        this.loadingUsers.set(false);
      },
      error: () => {
        this.alertService.error('Failed to load employees');
        this.loadingUsers.set(false);
      },
    });
  }

  onTargetRecipientChange(recipient: TargetRecipient): void {
    this.notificationForm.patchValue({ targetRecipient: recipient });

    // Clear selections
    this.notificationForm.patchValue({
      targetCompanyIds: [],
      targetEmployeeIds: [],
    });

    // Load users if specific target
    if (recipient === 'specific_company') {
      this.loadCompanies();
    } else if (recipient === 'specific_employee') {
      this.loadEmployees();
    }
  }

  onDeliveryMethodChange(method: 'now' | 'scheduled'): void {
    this.notificationForm.patchValue({ deliveryMethod: method });
    const scheduledControl = this.notificationForm.get('scheduledAt');
    if (method === 'scheduled') {
      scheduledControl?.setValidators([Validators.required]);
    } else {
      scheduledControl?.clearValidators();
    }
    scheduledControl?.updateValueAndValidity();
  }

  onCompanyToggle(companyId: string): void {
    const current = this.notificationForm.get('targetCompanyIds')?.value || [];
    const updated = current.includes(companyId)
      ? current.filter((id: string) => id !== companyId)
      : [...current, companyId];
    this.notificationForm.patchValue({ targetCompanyIds: updated });
  }

  onEmployeeToggle(employeeId: string): void {
    const current = this.notificationForm.get('targetEmployeeIds')?.value || [];
    const updated = current.includes(employeeId)
      ? current.filter((id: string) => id !== employeeId)
      : [...current, employeeId];
    this.notificationForm.patchValue({ targetEmployeeIds: updated });
  }

  isCompanySelected(companyId: string): boolean {
    const selected = this.notificationForm.get('targetCompanyIds')?.value || [];
    return selected.includes(companyId);
  }

  isEmployeeSelected(employeeId: string): boolean {
    const selected = this.notificationForm.get('targetEmployeeIds')?.value || [];
    return selected.includes(employeeId);
  }

  submitForm(isDraft = false): void {
    if (!isDraft && this.notificationForm.invalid) {
      this.notificationForm.markAllAsTouched();
      this.alertService.error('Please fill in all required fields correctly.');
      return;
    }

    const formVal = this.notificationForm.value;
    this.isSubmitting.set(true);

    const payload = {
      title: formVal.title || 'Untitled Notification',
      message: formVal.message || '',
      type: formVal.type,
      targetRecipient: formVal.targetRecipient,
      targetCompanyIds: formVal.targetRecipient === 'specific_company' ? formVal.targetCompanyIds : undefined,
      targetEmployeeIds: formVal.targetRecipient === 'specific_employee' ? formVal.targetEmployeeIds : undefined,
      deliveryMethod: isDraft ? 'now' : formVal.deliveryMethod,
      scheduledAt: (!isDraft && formVal.deliveryMethod === 'scheduled') ? formVal.scheduledAt : undefined,
    };

    const request = this.isEditing()
      ? this.notificationService.update(this.notificationId()!, payload as any)
      : this.notificationService.create(payload as any);

    request.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.alertService.toast(res.message || 'Notification saved', 'success');
        this.goBack();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error(err);
        this.alertService.error(err.error?.message || 'Failed to save notification');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/admin-notifications']);
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'info': 'bi bi-info-circle text-info',
      'warning': 'bi bi-exclamation-triangle text-warning',
      'announcement': 'bi bi-megaphone text-success',
      'alert': 'bi bi-exclamation-octagon text-danger',
      'error': 'bi bi-exclamation-octagon text-danger',  // Added for completeness
    };
    return icons[type] || 'bi bi-info-circle text-info';
  }

  getRecipientLabel(recipient: string): string {
    const labels: { [key: string]: string } = {
      'all_companies': 'All Companies',
      'all_employees': 'All Employees',
      'all_users': 'All Users',
      'specific_company': 'Specific Companies',
      'specific_employee': 'Specific Employees',
    };
    return labels[recipient] || 'Unknown';
  }
}
