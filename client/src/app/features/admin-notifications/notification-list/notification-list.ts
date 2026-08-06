import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminNotificationService } from '../../../core/services/admin-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminNotification, AdminNotificationStatus, NotificationType } from '../../../core/models/admin-notification.model';

@Component({
  selector: 'app-admin-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class AdminNotificationListComponent implements OnInit {
  private readonly notificationService = inject(AdminNotificationService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly notifications = signal<AdminNotification[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('all');
  readonly typeFilter = signal<string>('all');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalPages = signal<number>(1);
  readonly totalRecords = signal<number>(0);

  // Schedule Modal state
  readonly showScheduleModal = signal<boolean>(false);
  readonly selectedNotification = signal<AdminNotification | null>(null);
  readonly isScheduling = signal<boolean>(false);

  scheduleForm!: FormGroup;

  readonly filteredNotifications = computed(() => {
    return this.notifications();
  });

  ngOnInit(): void {
    this.initScheduleForm();
    this.loadNotifications();
  }

  private initScheduleForm(): void {
    const defaultDate = new Date(Date.now() + 3600000);
    const isoLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    this.scheduleForm = this.fb.group({
      scheduledAt: [isoLocal, [Validators.required]],
    });
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService
      .getAll({
        status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
        type: this.typeFilter() !== 'all' ? this.typeFilter() : undefined,
        search: this.searchTerm() || undefined,
        page: this.currentPage(),
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          if (res.data && typeof res.data === 'object' && 'data' in res.data) {
            const data = res.data as any;
            this.notifications.set(data.data || []);
            const pagination = data.pagination || {};
            this.totalRecords.set(pagination.total || 0);
            this.totalPages.set(pagination.pages || 1);
            this.currentPage.set(pagination.page || 1);
          } else {
            this.notifications.set((res.data as any) || []);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Failed to load notifications');
          this.isLoading.set(false);
        },
      });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
    this.loadNotifications();
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadNotifications();
  }

  onTypeFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.typeFilter.set(val);
    this.currentPage.set(1);
    this.loadNotifications();
  }

  createNotification(): void {
    this.router.navigate(['/admin/admin-notifications/create']);
  }

  editNotification(notification: AdminNotification): void {
    if (notification.status === 'sent') {
      this.alertService.info('Sent notifications cannot be edited.');
      return;
    }
    this.router.navigate(['/admin/admin-notifications/edit', notification._id]);
  }

  viewNotification(notification: AdminNotification): void {
    this.router.navigate(['/admin/admin-notifications/view', notification._id]);
  }

  openScheduleModal(notification: AdminNotification): void {
    if (notification.status === 'sent') {
      this.alertService.info('Already sent notifications cannot be scheduled.');
      return;
    }
    this.selectedNotification.set(notification);
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
    this.selectedNotification.set(null);
    this.isScheduling.set(false);
  }

  confirmSchedule(): void {
    if (this.scheduleForm.invalid || !this.selectedNotification()) {
      return;
    }

    this.isScheduling.set(true);
    const scheduledAt = this.scheduleForm.get('scheduledAt')?.value;
    const notification = this.selectedNotification();

    this.notificationService.schedule(notification!._id, scheduledAt).subscribe({
      next: () => {
        this.alertService.success('Notification scheduled successfully');
        this.closeScheduleModal();
        this.loadNotifications();
        this.isScheduling.set(false);
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Failed to schedule notification');
        this.isScheduling.set(false);
      },
    });
  }

  cancelSchedule(notification: AdminNotification): void {
    if (notification.status !== 'scheduled') {
      this.alertService.info('Only scheduled notifications can be cancelled.');
      return;
    }

    if (confirm('Are you sure you want to cancel this scheduled notification?')) {
      this.notificationService.cancel(notification._id).subscribe({
        next: () => {
          this.alertService.success('Notification cancelled successfully');
          this.loadNotifications();
        },
        error: (err) => {
          this.alertService.error(err.error?.message || 'Failed to cancel notification');
        },
      });
    }
  }

  deleteNotification(notification: AdminNotification): void {
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.delete(notification._id).subscribe({
        next: () => {
          this.alertService.success('Notification deleted successfully');
          this.loadNotifications();
        },
        error: (err) => {
          this.alertService.error(err.error?.message || 'Failed to delete notification');
        },
      });
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadNotifications();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadNotifications();
    }
  }

  getStatusBadgeClass(status: AdminNotificationStatus): string {
    switch (status) {
      case 'sent':
        return 'badge bg-success';
      case 'scheduled':
        return 'badge bg-info';
      case 'draft':
        return 'badge bg-warning text-dark';
      case 'cancelled':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getTypeBadgeClass(type: NotificationType): string {
    switch (type) {
      case 'warning':
        return 'badge bg-warning text-dark border border-warning';
      case 'alert':
        return 'badge bg-danger text-white border border-danger';
      case 'announcement':
        return 'badge bg-success text-white border border-success';
      default:
        return 'badge bg-info text-white border border-info';
    }
  }

  getTypeIcon(type: NotificationType): string {
    const icons: { [key: string]: string } = {
      'info': 'bi bi-info-circle text-info',
      'warning': 'bi bi-exclamation-triangle text-warning',
      'announcement': 'bi bi-megaphone text-success',
      'alert': 'bi bi-exclamation-octagon text-danger',
      'error': 'bi bi-exclamation-triangle text-danger',  // Added for completeness
    };
    return icons[type] || 'bi bi-info-circle text-info';
  }

  getTargetLabel(notification: AdminNotification): string {
    const labels: { [key: string]: string } = {
      'all_companies': 'All Companies',
      'all_employees': 'All Employees',
      'all_users': 'All Users',
      'specific_company': 'Specific Companies',
      'specific_employee': 'Specific Employees',
    };
    return labels[notification.targetRecipient] || 'Unknown';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  sendNow(notification: AdminNotification): void {
    if (notification.status === 'sent') {
      this.alertService.info('This notification has already been sent.');
      return;
    }

    if (confirm('Send this notification now?')) {
      this.notificationService.schedule(notification._id, new Date().toISOString()).subscribe({
        next: () => {
          this.alertService.success('Notification sent successfully');
          this.loadNotifications();
        },
        error: (err) => {
          this.alertService.error(err.error?.message || 'Failed to send notification');
        },
      });
    }
  }

  submitSchedule(): void {
    this.confirmSchedule();
  }
}
