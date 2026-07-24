import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { DashboardService, EmployeeNotification } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

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

  readonly notifications = signal<EmployeeNotification[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<'recent' | 'unread' | 'read'>('recent');
  readonly unreadCount = computed(() => this.notifications().filter((item) => !item.isRead).length);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getEmployeeNotifications(this.filter(), 1, 20)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data?.notifications || []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee notifications:', error);
          this.error.set('Unable to load notifications right now.');
          this.loading.set(false);
        }
      });
  }

  setFilter(value: 'recent' | 'unread' | 'read'): void {
    this.filter.set(value);
    this.loadNotifications();
  }

  markNotificationAsRead(notification: EmployeeNotification): void {
    if (!notification._id || notification.isRead) {
      return;
    }

    this.dashboardService.markEmployeeNotificationAsRead(notification._id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notifications.update((list) => list.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.error.set('Unable to update this notification.');
        }
      });
  }

  formatNotificationDate(value?: string | null): string {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  }

  getRolePrefix(): string {
    return this.authService.role() || 'employee';
  }
}
