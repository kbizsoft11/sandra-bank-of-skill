import { Component, inject, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AdminDashboardService, DashboardStats, ChartData, Notification, Activity } from '../../core/services/admin-dashboard.service';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('companiesGrowthChart') companiesGrowthChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeesGrowthChart') employeesGrowthChart!: ElementRef<HTMLCanvasElement>;

  private readonly dashboardService = inject(AdminDashboardService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly stats = signal<DashboardStats | null>(null);
  readonly chartData = signal<ChartData | null>(null);
  readonly notifications = signal<Notification[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Chart instances
  private companiesChart: Chart | null = null;
  private employeesChart: Chart | null = null;

  // Month filter
  readonly selectedMonth = signal<number>(new Date().getMonth() + 1);
  readonly selectedYear = signal<number>(new Date().getFullYear());

  readonly availableMonths = signal<{ label: string; value: number }[]>(
    this.generateMonths()
  );

  // Filters
  readonly notificationFilter = signal<'recent' | 'unread' | 'read'>('recent');

  // Computed
  readonly unreadNotificationsCount = computed(() =>
    this.notifications().filter(n => !n.isRead).length
  );

  readonly adminName = computed(() => this.authService.user()?.fullName || 'Admin');

  private generateMonths(): { label: string; value: number }[] {
    const months = [
      { label: 'January', value: 1 },
      { label: 'February', value: 2 },
      { label: 'March', value: 3 },
      { label: 'April', value: 4 },
      { label: 'May', value: 5 },
      { label: 'June', value: 6 },
      { label: 'July', value: 7 },
      { label: 'August', value: 8 },
      { label: 'September', value: 9 },
      { label: 'October', value: 10 },
      { label: 'November', value: 11 },
      { label: 'December', value: 12 },
    ];
    return months;
  }

  ngOnInit(): void {
    this.checkAdminAccess();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderCharts();
    }, 500);
  }

  private checkAdminAccess(): void {
    if (this.authService.role() !== 'admin') {
      this.router.navigate(['/auth/login']);
      this.alertService.error('Admin access required');
    }
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load stats
    this.dashboardService.getStats().subscribe({
      next: (response) => {
        if (response.data) {
          this.stats.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.error.set('Failed to load dashboard statistics');
      },
    });

    // Load chart data
    this.dashboardService.getChartData(this.selectedMonth(), this.selectedYear()).subscribe({
      next: (response) => {
        if (response.data) {
          this.chartData.set(response.data);
          // Render charts after data is loaded
          setTimeout(() => {
            this.renderCharts();
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error loading chart data:', error);
      },
    });

    // Load notifications
    this.loadNotifications();

    // Load activities
    this.loadActivities();

    this.loading.set(false);
  }

  private loadNotifications(): void {
    this.dashboardService.getNotifications(this.notificationFilter(), 1, 10).subscribe({
      next: (response) => {
        if (response.data?.notifications) {
          this.notifications.set(response.data.notifications);
        }
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      },
    });
  }

  private loadActivities(): void {
    this.dashboardService.getRecentActivities(1, 10).subscribe({
      next: (response) => {
        if (response.data?.activities) {
          this.activities.set(response.data.activities);
        }
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      },
    });
  }

  private renderCharts(): void {
    const data = this.chartData();
    if (!data) return;

    this.renderCompaniesGrowthChart(data.companiesGrowth);
    this.renderEmployeesGrowthChart(data.employeesGrowth);
  }

  private renderCompaniesGrowthChart(growthData: any[]): void {
    if (!this.companiesGrowthChart || !growthData) return;

    const canvas = this.companiesGrowthChart.nativeElement;

    // Destroy previous chart if exists
    if (this.companiesChart) {
      this.companiesChart.destroy();
    }

    // Format data for chart
    const labels = growthData.map(item =>
      this.formatMonthYear(item._id.year, item._id.month)
    );
    const counts = growthData.map(item => item.count);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Companies Created',
            data: counts,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#0d6efd',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    };

    this.companiesChart = new Chart(canvas, config);
  }

  private renderEmployeesGrowthChart(growthData: any[]): void {
    if (!this.employeesGrowthChart || !growthData) return;

    const canvas = this.employeesGrowthChart.nativeElement;

    // Destroy previous chart if exists
    if (this.employeesChart) {
      this.employeesChart.destroy();
    }

    // Format data for chart
    const labels = growthData.map(item =>
      this.formatMonthYear(item._id.year, item._id.month)
    );
    const counts = growthData.map(item => item.count);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Employees Added',
            data: counts,
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#198754',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    };

    this.employeesChart = new Chart(canvas, config);
  }

  private formatMonthYear(year: number, month: number): string {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${monthNames[month - 1]} ${year}`;
  }

  onMonthChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedMonth.set(parseInt(select.value, 10));
    this.loadDashboardData();
  }

  onYearChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedYear.set(parseInt(select.value, 10));
    this.loadDashboardData();
  }

  getCurrentMonthYear(): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[this.selectedMonth() - 1]} ${this.selectedYear()}`;
  }

  onNotificationFilterChange(filter: 'recent' | 'unread' | 'read'): void {
    this.notificationFilter.set(filter);
    this.loadNotifications();
  }

  markNotificationAsRead(notification: Notification): void {
    if (notification.isRead) return;

    this.dashboardService.markNotificationAsRead(notification._id).subscribe({
      next: () => {
        const updated = this.notifications().map(n =>
          n._id === notification._id ? { ...n, isRead: true } : n
        );
        this.notifications.set(updated);
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      },
    });
  }

  markNotificationAsUnread(notification: Notification): void {
    if (!notification.isRead) return;

    this.dashboardService.markNotificationAsUnread(notification._id).subscribe({
      next: () => {
        const updated = this.notifications().map(n =>
          n._id === notification._id ? { ...n, isRead: false } : n
        );
        this.notifications.set(updated);
      },
      error: (error) => {
        console.error('Error marking notification as unread:', error);
      },
    });
  }

  navigateToAddCompany(): void {
    this.router.navigate(['/admin/companies']);
  }

  navigateToAddEmployee(): void {
    this.router.navigate(['/admin/users-admin']);
  }

  navigateToAddSkillCategory(): void {
    this.router.navigate(['/admin/skill-categories']);
  }

  navigateToAddQuestionnaire(): void {
    this.router.navigate(['/admin/questionnaires']);
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-danger';
      case 'info':
      default:
        return 'bg-info';
    }
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
