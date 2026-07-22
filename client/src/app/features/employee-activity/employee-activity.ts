import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { DataTableComponent } from '../../shared/data-table/data-table.component';
import { TableColDirective } from '../../shared/data-table/table-col.directive';
import { TableColumn } from '../../shared/data-table/table-column.model';

@Component({
  selector: 'app-employee-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableColDirective],
  templateUrl: './employee-activity.html',
  styleUrl: './employee-activity.scss',
})
export class EmployeeActivity implements OnInit {
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Activities data
  activities = signal<any[]>([]);
  isLoadingActivities = signal<boolean>(false);
  totalActivities = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  employees = signal<any[]>([]);
  selectedEmployee = '';
  activityType: 'all' | 'login' | 'course' | 'assessment' | 'skill' = 'all';
  dateRangeFilter: 'all' | 'today' | 'week' | 'month' | 'custom' = 'all';
  customStartDate = '';
  customEndDate = '';
  searchTerm = '';
  selectedStatus = '';
  showFilters = signal<boolean>(false);

  // Table columns
  readonly columns: TableColumn[] = [
    { key: 'employeeName', header: 'Employee', sortable: true },
    { key: 'activityType', header: 'Activity Type', sortable: true },
    { key: 'description', header: 'Description', sortable: false },
    { key: 'status', header: 'Status' },
    { key: 'timestamp', header: 'Date & Time', sortable: true },
    { key: 'actions', header: 'Actions', align: 'end', width: '150px' },
  ];

  ngOnInit(): void {
    this.loadEmployees();
    this.loadActivities();
  }

  loadEmployees(): void {
    this.userService.searchEmployees({
      accountStatus: 'joined',
      limit: 100, // API maximum is 100
      page: 1,
    }).subscribe({
      next: (response) => {
        const data = response?.data;
        const employees = Array.isArray(data?.employees) ? data.employees : [];
        this.employees.set(employees);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      },
    });
  }

  loadActivities(): void {
    this.isLoadingActivities.set(true);

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      activityType: this.activityType !== 'all' ? this.activityType : undefined,
      employeeId: this.selectedEmployee || undefined,
      status: this.selectedStatus || undefined,
      search: this.searchTerm || undefined,
    };

    // Add date range filter
    if (this.dateRangeFilter === 'custom' && this.customStartDate && this.customEndDate) {
      params.startDate = this.customStartDate;
      params.endDate = this.customEndDate;
    } else if (this.dateRangeFilter !== 'all') {
      params.dateRange = this.dateRangeFilter;
    }

    // Call API to get all activities (you'll need to create this endpoint)
    this.userService.getAllActivities(params).subscribe({
      next: (response) => {
        this.isLoadingActivities.set(false);
        this.activities.set(response.data?.activities || response.data || []);
        this.totalActivities = response.data?.total || response.data?.length || 0;
      },
      error: (error) => {
        this.isLoadingActivities.set(false);
        console.error('Error loading activities:', error);
        // Show mock data for now
        this.loadMockData();
      },
    });
  }

  // Temporary mock data until backend is ready
  private loadMockData(): void {
    const mockActivities = [
      {
        _id: '1',
        employeeName: 'John Doe',
        employeeId: 'emp1',
        activityType: 'login',
        description: 'Logged in from Chrome on Windows',
        status: 'success',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        device: 'Chrome/Windows',
      },
      {
        _id: '2',
        employeeName: 'Jane Smith',
        employeeId: 'emp2',
        activityType: 'course',
        description: 'Completed Angular Advanced Course',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        score: 95,
      },
      {
        _id: '3',
        employeeName: 'Bob Johnson',
        employeeId: 'emp3',
        activityType: 'assessment',
        description: 'JavaScript Fundamentals Test',
        status: 'passed',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        score: 87,
      },
    ];

    this.activities.set(mockActivities);
    this.totalActivities = mockActivities.length;
    this.isLoadingActivities.set(false);
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadActivities();
  }

  clearFilters(): void {
    this.selectedEmployee = '';
    this.activityType = 'all';
    this.dateRangeFilter = 'all';
    this.customStartDate = '';
    this.customEndDate = '';
    this.searchTerm = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadActivities();
  }

  onSort(event: { key: string; direction: 'asc' | 'desc' | null }): void {
    // Implement sorting logic
    this.loadActivities();
  }

  onPage(page: number): void {
    this.currentPage = page;
    this.loadActivities();
  }

  onPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadActivities();
  }

  getActivityIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'login': return 'bi-box-arrow-in-right';
      case 'course': return 'bi-book';
      case 'assessment': return 'bi-clipboard-check';
      case 'skill': return 'bi-star';
      default: return 'bi-activity';
    }
  }

  getActivityColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'login': return 'primary';
      case 'course': return 'success';
      case 'assessment': return 'warning';
      case 'skill': return 'info';
      default: return 'secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'passed':
      case 'success':
        return 'bg-success text-white';
      case 'in-progress':
      case 'pending':
        return 'bg-warning text-dark';
      case 'failed':
      case 'error':
        return 'bg-danger text-white';
      case 'active':
        return 'bg-info text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  viewEmployeeDetails(activity: any): void {
    const role = this.auth.role();
    const basePath = role === 'admin' ? '/admin' : `/${role}`;
    this.router.navigate([`${basePath}/users`, activity.employeeId, 'profile']);
  }

  exportActivities(): void {
    this.alertService.toast('Exporting activities...', 'info');
    
    const headers = ['Employee', 'Activity Type', 'Description', 'Status', 'Date & Time'];
    const rows = this.activities().map(activity => [
      activity.employeeName || 'N/A',
      activity.activityType || 'N/A',
      activity.description || 'N/A',
      activity.status || 'N/A',
      activity.timestamp || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_activities_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.alertService.toast('Activities exported successfully', 'success');
  }
}
