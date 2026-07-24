import { Component, EventEmitter, inject, Output, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';
import { Router } from '@angular/router';
import { API_CONFIG } from '../../../core/config/api.config';
import { DashboardService, EmployeeNotification } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.scss',
})
export class DashboardHeader implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  showProfileMenu = false;
  showNotificationsMenu = false;
  profileImage = signal<string | null>(null);
  readonly notifications = signal<EmployeeNotification[]>([]);
  readonly notificationsLoading = signal(false);
  readonly notificationsError = signal<string | null>(null);
  readonly unreadNotificationsCount = computed(() => this.notifications().filter((notification) => !notification.isRead).length);
  private docClickHandler = () => {
    this.showProfileMenu = false;
    this.showNotificationsMenu = false;
  };

  @Output() toggleSidebar = new EventEmitter<void>();

  ngOnInit(): void {
    document.addEventListener('click', this.docClickHandler);
    this.loadUserProfile();
    this.loadEmployeeNotifications();
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.docClickHandler);
  }

  loadUserProfile(): void {
    this.userService.getMyProfile().subscribe({
      next: (response) => {
        const userData = response.data;
        if (userData.profileImage) {
          this.profileImage.set(`${API_CONFIG.SERVER_URL}${userData.profileImage}`);
        }
      },
      error: (error) => {
        console.error('Error loading profile image:', error);
      }
    });
  }

  loadEmployeeNotifications(): void {
    if (this.auth.role() !== 'employee') {
      this.notifications.set([]);
      this.notificationsLoading.set(false);
      this.notificationsError.set(null);
      return;
    }

    this.notificationsLoading.set(true);
    this.notificationsError.set(null);

    this.dashboardService.getEmployeeNotifications('recent', 1, 5)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data?.notifications || []);
          this.notificationsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee notifications:', error);
          this.notificationsError.set('Unable to load notifications right now.');
          this.notificationsLoading.set(false);
        }
      });
  }

  get profileLink(): string {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;
    return `${basePath}/profile`;
  }

  getNotificationsRoute(): string {
    const role = this.auth.role();
    if (role === 'employee') {
      return '/employee/my-notifications';
    }
    if (role === 'company') {
      return '/company/notifications';
    }
    return '/admin/dashboard';
  }

  getUserId(): string {
    const user = this.auth.user();
    return user?._id?.toString().slice(-5) || '42001';
  }

  getInitials(): string {
    const name = this.auth.user()?.fullName || 'User';
    return name.charAt(0).toUpperCase();
  }

  getRandomColor(): string {
    const name = this.auth.user()?.fullName || 'User';
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471ed', '#12c2e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotificationsMenu = false;
  }

  toggleNotificationsMenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showNotificationsMenu = !this.showNotificationsMenu;
    this.showProfileMenu = false;

    if (this.showNotificationsMenu) {
      this.loadEmployeeNotifications();
    }
  }

  goToNotificationsPage(): void {
    this.showNotificationsMenu = false;
    this.router.navigate([this.getNotificationsRoute()]);
  }

  markNotificationAsRead(notification: EmployeeNotification, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

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

  logout(): void {
    this.alertService.confirm(
      'You will be logged out of your account.',
      'Are you sure you want to logout?',
      'Yes, logout',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        this.alertService.toast('Logged out successfully', 'success');
      }
    });
  }

  get isDark(): boolean {
    return this.themeService.getTheme() === 'dark';
  }

}