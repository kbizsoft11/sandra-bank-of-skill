import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { take } from 'rxjs';

import { DashboardService, EmployeeNotification } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-employee-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-notifications.html',
  styleUrl: './employee-notifications.scss',
})
export class EmployeeNotifications implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly notifications = signal<EmployeeNotification[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<'recent' | 'unread' | 'read'>('recent');
  readonly unreadCount = computed(() => this.notifications().filter((item) => !item.isRead).length);
  
  // Modal state
  readonly showViewModal = signal(false);
  readonly selectedNotification = signal<EmployeeNotification | null>(null);
  readonly isMarkingAsRead = signal(false);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getEmployeeNotificationsScalable(this.filter(), 1, 20)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          // Map the response data to ensure proper field naming
          const notifications = (response.data?.notifications || []).map((notif: any) => ({
            _id: notif._id || notif.notificationId,
            title: notif.title,
            message: notif.message,
            type: notif.type || 'info',
            isRead: notif.isRead,
            createdAt: notif.createdAt,
            notificationId: notif.notificationId || notif._id, // Keep both for compatibility
          }));
          this.notifications.set(notifications);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.error.set('Unable to load notifications right now.');
          this.loading.set(false);
        }
      });
  }

  setFilter(value: 'recent' | 'unread' | 'read'): void {
    this.filter.set(value);
    this.loadNotifications();
  }

  openNotificationModal(notification: EmployeeNotification): void {
    this.selectedNotification.set(notification);
    this.showViewModal.set(true);

    // Mark as read when opening modal
    if (!notification.isRead) {
      this.markAsReadFromModal(notification);
    }
  }

  closeNotificationModal(): void {
    this.showViewModal.set(false);
    setTimeout(() => {
      this.selectedNotification.set(null);
    }, 300);
  }

  markAsReadFromModal(notification: EmployeeNotification): void {
    if (!notification.notificationId || notification.isRead) {
      return;
    }

    this.isMarkingAsRead.set(true);

    this.dashboardService.markEmployeeNotificationAsReadScalable(notification.notificationId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notifications.update((list) => list.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
          this.selectedNotification.update((current) => current ? { ...current, isRead: true } : null);
          this.isMarkingAsRead.set(false);
          this.alertService.success('Notification marked as read');
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.isMarkingAsRead.set(false);
          this.alertService.error('Failed to mark notification as read');
        }
      });
  }

  markNotificationAsRead(notification: EmployeeNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!notification.notificationId || notification.isRead) {
      return;
    }

    this.dashboardService.markEmployeeNotificationAsReadScalable(notification.notificationId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notifications.update((list) => list.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
          this.alertService.toast('Marked as read', 'success');
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.alertService.error('Unable to mark as read');
        }
      });
  }

  formatNotificationDate(value?: string | null): string {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  formatFullDate(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  getNotificationIcon(type?: string): string {
    switch (type) {
      case 'success':
        return 'bi bi-check-circle-fill text-success';
      case 'warning':
        return 'bi bi-exclamation-circle-fill text-warning';
      case 'error':
        return 'bi bi-exclamation-triangle-fill text-danger';
      default:
        return 'bi bi-info-circle-fill text-info';
    }
  }

  trackNotification(index: number, notification: EmployeeNotification): string {
    return notification._id || index.toString();
  }

  getRolePrefix(): string {
    return this.authService.role() || 'employee';
  }

  goBack(): void {
    this.router.navigate(['/employee/dashboard']);
  }
}
