import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { DashboardService, EmployeeNotification } from '../../../core/services/dashboard.service';
import { AdminDashboardComponent } from '../../admin-dashboard/admin-dashboard';
import { CompanyDashboard } from '../../company-dashboard/company-dashboard';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminDashboardComponent, CompanyDashboard],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  // Admin stats
  readonly adminStats = signal<any>(null);
  
  // Employee stats
  readonly employeeStats = signal<any>(null);
  readonly employeeNotifications = signal<EmployeeNotification[]>([]);
  readonly notificationsLoading = signal(true);
  readonly notificationsError = signal<string | null>(null);
  readonly notificationFilter = signal<'recent' | 'unread' | 'read'>('recent');
  
  readonly loading = signal(true);

  get currentUserName(): string {
    const user = this.authService.user();
    return user?.fullName || 'User';
  }

  get currentRole(): string {
    return this.authService.role() || '';
  }

  isAdmin = computed(() => this.authService.isAdmin());
  isCompany = computed(() => this.authService.isCompany());
  isEmployee = computed(() => this.authService.isEmployee());
  readonly unreadNotificationsCount = computed(() => this.employeeNotifications().filter((notification) => !notification.isRead).length);

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  private loadDashboardStats(): void {
    this.loading.set(true);
    
    const role = this.authService.role();

    if (role === 'admin') {
      this.loadAdminStats();
    } else if (role === 'company') {
      this.loading.set(false);
    } else if (role === 'employee') {
      this.loadEmployeeStats();
      this.loadEmployeeNotifications();
    } else {
      this.loading.set(false);
    }
  }

  private loadAdminStats(): void {
    this.dashboardService.getAdminStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.adminStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading admin stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadEmployeeStats(): void {
    this.dashboardService.getEmployeeStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadEmployeeNotifications(): void {
    this.notificationsLoading.set(true);
    this.notificationsError.set(null);

    this.dashboardService.getEmployeeNotifications(this.notificationFilter(), 1, 5)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeNotifications.set(response.data?.notifications || []);
          this.notificationsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee notifications:', error);
          this.notificationsError.set('Unable to load notifications right now.');
          this.notificationsLoading.set(false);
        }
      });
  }

  markNotificationAsRead(notification: EmployeeNotification): void {
    if (!notification._id || notification.isRead) return;

    this.dashboardService.markEmployeeNotificationAsRead(notification._id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.employeeNotifications.update((list) => list.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.notificationsError.set('Unable to update that notification.');
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
    const role = this.authService.role();
    return role || 'admin';
  }

  // Employee dashboard methods
  getUserInitials(): string {
    const name = this.currentUserName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toLowerCase();
    }
    return name.substring(0, 2).toLowerCase();
  }

  getPersonInitials(fullName: string): string {
    if (!fullName) return 'SP';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getAverageSkillLevel(): string {
    const avg = this.employeeStats()?.averageSkillLevel;
    return typeof avg === 'number' ? avg.toFixed(2) : '0.00';
  }

  getSkillLevelPercentage(): number {
    const avg = this.employeeStats()?.averageSkillLevel || 0;
    return (avg / 5) * 100;
  }

  getAverageInterestLevel(): string {
    const avg = this.employeeStats()?.averageInterestLevel;
    return typeof avg === 'number' ? avg.toFixed(2) : '0.00';
  }

  getInterestLevelPercentage(): number {
    const avg = this.employeeStats()?.averageInterestLevel || 0;
    return (avg / 5) * 100;
  }

  getCategorySegment(category: any, level: string): number {
    if (!category || !category.levels) return 25;
    
    const levelMap: { [key: string]: string } = {
      'expert': '5',
      'advanced': '4',
      'intermediate': '3',
      'beginner': '2'
    };
    
    const levelKey = levelMap[level];
    const count = category.levels?.[levelKey] || 0;
    const total = category.count || 1;
    
    return (count / total) * 100;
  }

  // Make Math available in template
  Math = Math;
}