import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivityLogsService, ActivityLog, ActivityLogsQueryParams } from '../../core/services/activity-logs.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { DataTableComponent } from '../../shared/data-table/data-table.component';
import { TableColDirective } from '../../shared/data-table/table-col.directive';
import { TableColumn } from '../../shared/data-table/table-column.model';

@Component({
  selector: 'app-admin-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableColDirective],
  templateUrl: './admin-activity-logs.html',
  styleUrl: './admin-activity-logs.scss',
})
export class AdminActivityLogs implements OnInit {
  private readonly activityLogsService = inject(ActivityLogsService);
  private readonly alertService = inject(AlertService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Activities data
  activities = signal<ActivityLog[]>([]);
  isLoadingActivities = signal<boolean>(false);
  totalActivities = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  selectedActionType = '';
  selectedResource = '';
  selectedStatus = '';
  selectedUserId = '';
  selectedCompanyId = '';
  selectedUserRole = '';
  dateRangeFilter: 'all' | 'today' | 'week' | 'month' | 'custom' = 'all';
  customStartDate = '';
  customEndDate = '';
  searchTerm = '';
  showFilters = signal<boolean>(false);

  // Filter options
  actionTypeOptions: string[] = [];
  resourceTypeOptions: string[] = [];
  statusOptions: string[] = [];
  userRoleOptions: string[] = [];

  // Table columns
  readonly columns: TableColumn[] = [
    { key: 'userName', header: 'User', sortable: true },
    { key: 'actionType', header: 'Action', sortable: true },
    { key: 'resource', header: 'Resource', sortable: true },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Date & Time', sortable: true },
    { key: 'actions', header: 'Actions', align: 'end', width: '150px' },
  ];

  // Activity types description for info modal
  readonly activityDescriptions = {
    'Authentication & Access': [
      { action: 'Login', description: 'User logs into the system' },
      { action: 'Logout', description: 'User logs out of the system' },
      { action: 'Password Reset', description: 'User resets their password' },
      { action: 'Email Verify', description: 'User verifies their email' },
      { action: 'Account Activate', description: 'Admin activates user account' },
      { action: 'Account Deactivate', description: 'Admin deactivates user account' },
    ],
    'Resource Management': [
      { action: 'Create', description: 'New user, skill, company, or category created' },
      { action: 'Update', description: 'Existing resource modified' },
      { action: 'Delete', description: 'Resource deleted from system' },
      { action: 'Assign', description: 'Skill assigned to category or resource' },
      { action: 'Unassign', description: 'Skill removed from category' },
    ],
    'Data Access & Operations': [
      { action: 'View', description: 'Restricted data accessed (assessments, etc.)' },
      { action: 'Export', description: 'Data exported from system' },
      { action: 'Import', description: 'Data imported into system' },
      { action: 'Bulk Action', description: 'Bulk operations performed on multiple resources' },
    ],
    'System Operations': [
      { action: 'System Config', description: 'System settings or configuration changed' },
    ],
  };

  showInfoModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  selectedActivity = signal<ActivityLog | null>(null);

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadActivities();
  }

  /**
   * Load filter dropdown options
   */
  loadFilterOptions(): void {
    this.actionTypeOptions = this.activityLogsService.getActivityTypeOptions();
    this.resourceTypeOptions = this.activityLogsService.getResourceTypeOptions();
    this.statusOptions = this.activityLogsService.getStatusOptions();
    
    // Only admins can filter by user role, user, and company
    if (this.auth.role() === 'admin') {
      this.userRoleOptions = this.activityLogsService.getUserRoleOptions();
    }
  }

  /**
   * Load activities with current filters
   */
  loadActivities(): void {
    this.isLoadingActivities.set(true);

    const params: ActivityLogsQueryParams = {
      page: this.currentPage,
      limit: this.pageSize,
      actionType: this.selectedActionType,
      resource: this.selectedResource,
      status: this.selectedStatus,
      search: this.searchTerm,
    };

    // Add admin-only filters
    if (this.auth.role() === 'admin') {
      if (this.selectedUserId) params.userId = this.selectedUserId;
      if (this.selectedCompanyId) params.companyId = this.selectedCompanyId;
      if (this.selectedUserRole) params.userRole = this.selectedUserRole;
    }

    // Add date range filter
    if (this.dateRangeFilter === 'custom' && this.customStartDate && this.customEndDate) {
      params.startDate = this.customStartDate;
      params.endDate = this.customEndDate;
    } else if (this.dateRangeFilter !== 'all') {
      // Calculate date range for relative filters
      const today = new Date();
      params.endDate = today.toISOString().split('T')[0];

      switch (this.dateRangeFilter) {
        case 'today':
          params.startDate = params.endDate;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          params.startDate = monthAgo.toISOString().split('T')[0];
          break;
      }
    }

    this.activityLogsService.getActivities(params).subscribe({
      next: (response) => {
        this.isLoadingActivities.set(false);
        this.activities.set(response.data?.activities || []);
        this.totalActivities = response.data?.total || 0;
      },
      error: (error) => {
        this.isLoadingActivities.set(false);
        console.error('Error loading activities:', error);
        this.alertService.toast('Failed to load activity logs', 'error');
      },
    });
  }

  /**
   * Toggle filters panel
   */
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  /**
   * Apply current filters
   */
  applyFilters(): void {
    this.currentPage = 1;
    this.loadActivities();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedActionType = '';
    this.selectedResource = '';
    this.selectedStatus = '';
    this.selectedUserId = '';
    this.selectedCompanyId = '';
    this.selectedUserRole = '';
    this.dateRangeFilter = 'all';
    this.customStartDate = '';
    this.customEndDate = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Search activities
   */
  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.loadActivities();
  }

  /**
   * Handle sort change
   */
  onSort(event: { key: string; direction: 'asc' | 'desc' | null }): void {
    // Sort is handled by backend - reload with current filters
    this.loadActivities();
  }

  /**
   * Handle page change
   */
  onPage(page: number): void {
    this.currentPage = page;
    this.loadActivities();
  }

  /**
   * Handle page size change
   */
  onPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadActivities();
  }

  /**
   * Get icon for action type
   */
  getActionIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'login':
      case 'logout':
        return 'bi-box-arrow-in-right';
      case 'create':
        return 'bi-plus-circle';
      case 'update':
        return 'bi-pencil-square';
      case 'delete':
        return 'bi-trash';
      case 'assign':
      case 'unassign':
        return 'bi-link';
      case 'view':
      case 'export':
        return 'bi-download';
      case 'import':
        return 'bi-upload';
      case 'password_reset':
        return 'bi-key';
      case 'email_verify':
        return 'bi-shield-check';
      default:
        return 'bi-activity';
    }
  }

  /**
   * Get color for action type
   */
  getActionColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'login':
        return 'success';
      case 'logout':
        return 'warning';
      case 'create':
      case 'assign':
        return 'info';
      case 'update':
        return 'primary';
      case 'delete':
      case 'unassign':
        return 'danger';
      case 'view':
      case 'export':
      case 'import':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Get color for resource type
   */
  getResourceColor(resource: string): string {
    switch (resource?.toLowerCase()) {
      case 'user':
        return 'primary';
      case 'company':
        return 'info';
      case 'skill':
      case 'skill_category':
        return 'success';
      case 'course':
      case 'assessment':
      case 'questionnaire':
        return 'warning';
      case 'document':
        return 'secondary';
      case 'system_settings':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-success text-white';
      case 'failure':
      case 'failed':
        return 'bg-danger text-white';
      case 'pending':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }

  /**
   * View activity details (open modal)
   */
  viewActivityDetails(activity: ActivityLog): void {
    console.log('View activity details:', activity);
    this.selectedActivity.set(activity);
    this.showDetailModal.set(true);
  }

  /**
   * Close detail modal
   */
  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedActivity.set(null);
  }

  /**
   * Export activities as CSV
   */
  exportActivities(): void {
    this.alertService.toast('Exporting activity logs...', 'info');

    // Build the same filter params as loadActivities
    const params: ActivityLogsQueryParams = {
      page: 1,
      limit: 10000, // Fetch up to 10,000 records for export
      actionType: this.selectedActionType,
      resource: this.selectedResource,
      status: this.selectedStatus,
      search: this.searchTerm,
    };

    // Add admin-only filters
    if (this.auth.role() === 'admin') {
      if (this.selectedUserId) params.userId = this.selectedUserId;
      if (this.selectedCompanyId) params.companyId = this.selectedCompanyId;
      if (this.selectedUserRole) params.userRole = this.selectedUserRole;
    }

    // Add date range filter
    if (this.dateRangeFilter === 'custom' && this.customStartDate && this.customEndDate) {
      params.startDate = this.customStartDate;
      params.endDate = this.customEndDate;
    } else if (this.dateRangeFilter !== 'all') {
      // Calculate date range for relative filters
      const today = new Date();
      params.endDate = today.toISOString().split('T')[0];

      switch (this.dateRangeFilter) {
        case 'today':
          params.startDate = params.endDate;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          params.startDate = monthAgo.toISOString().split('T')[0];
          break;
      }
    }

    // Fetch all filtered activities
    this.activityLogsService.getActivities(params).subscribe({
      next: (response) => {
        const activitiesToExport = response.data?.activities || [];

        if (activitiesToExport.length === 0) {
          this.alertService.toast('No activities to export', 'warning');
          return;
        }

        // Prepare CSV headers
        const headers = [
          'User Name',
          'Email',
          'Role',
          'Action',
          'Resource',
          'Resource Name',
          'Description',
          'Status',
          'IP Address',
          'User Agent',
          'Date & Time',
        ];

        // Prepare CSV rows
        const rows = activitiesToExport.map((activity) => [
          activity.userName || 'N/A',
          activity.userEmail || 'N/A',
          activity.userRole || 'N/A',
          activity.actionType || 'N/A',
          activity.resource || 'N/A',
          activity.resourceName || 'N/A',
          activity.description || 'N/A',
          activity.status || 'N/A',
          activity.ipAddress || 'N/A',
          activity.userAgent || 'N/A',
          activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A',
        ]);

        // Build CSV content
        const csvContent = [headers, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.alertService.toast(`Successfully exported ${activitiesToExport.length} activity logs`, 'success');
      },
      error: (error) => {
        console.error('Error exporting activities:', error);
        this.alertService.toast('Failed to export activity logs', 'error');
      },
    });
  }

  /**
   * Toggle info modal about tracked activities
   */
  toggleInfoModal(): void {
    this.showInfoModal.set(!this.showInfoModal());
  }

  /**
   * Close info modal
   */
  closeInfoModal(): void {
    this.showInfoModal.set(false);
  }
}
