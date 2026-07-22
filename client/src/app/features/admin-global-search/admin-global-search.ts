import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminGlobalSearchService, EntityType, StatusType, DashboardSummary, SearchResults, SearchPagination } from '../../core/services/admin-global-search.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-admin-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-global-search.html',
  styleUrl: './admin-global-search.scss',
})
export class AdminGlobalSearchComponent implements OnInit {
  private readonly searchService = inject(AdminGlobalSearchService);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);

  // Make Array and Math available to template
  readonly Array = Array;
  readonly Math = Math;

  // Dashboard Summary
  readonly dashboardSummary = signal<DashboardSummary | null>(null);

  // Search Filters
  readonly searchText = signal<string>('');
  readonly selectedEntity = signal<EntityType>('all');
  readonly selectedStatus = signal<StatusType | ''>('');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly sortBy = signal<string>('createdAt');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(20);

  // Results
  readonly searchResults = signal<SearchResults>({});
  readonly pagination = signal<SearchPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    counts: {},
  });

  // Loading and state
  readonly loading = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);

  // Quick filter options
  readonly entityOptions = [
    { label: 'All', value: 'all' },
    { label: 'Companies', value: 'companies' },
    { label: 'Employees', value: 'employees' },
  ];

  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending' },
    { label: 'Verified', value: 'verified' },
    { label: 'Unverified', value: 'unverified' },
  ];

  readonly sortOptions = [
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Name', value: 'fullName' },
    { label: 'Email', value: 'email' },
  ];

  readonly dateRangePresets = [
    { label: 'Today', getDates: () => this.getToday() },
    { label: 'Yesterday', getDates: () => this.getYesterday() },
    { label: 'Current Week', getDates: () => this.getCurrentWeek() },
    { label: 'Previous Week', getDates: () => this.getPreviousWeek() },
    { label: 'Current Month', getDates: () => this.getCurrentMonth() },
    { label: 'Previous Month', getDates: () => this.getPreviousMonth() },
    { label: 'Current Year', getDates: () => this.getCurrentYear() },
    { label: 'Clear', getDates: () => ({ start: '', end: '' }) },
  ];

  // Computed
  readonly hasFilters = computed(() => {
    return !!(
      this.searchText() ||
      this.selectedEntity() !== 'all' ||
      this.selectedStatus() ||
      this.startDate() ||
      this.endDate()
    );
  });

  readonly displayResults = computed(() => {
    const results = this.searchResults();
    const entity = this.selectedEntity();

    if (entity === 'all') {
      return results;
    }

    const key = entity as keyof SearchResults;
    return { [key]: results[key] } as SearchResults;
  });

  readonly resultCount = computed(() => {
    const entity = this.selectedEntity();
    const counts = this.pagination().counts;

    if (entity === 'all') {
      return Object.values(counts).reduce((a, b) => (a || 0) + (b || 0), 0);
    }

    return counts[entity as keyof typeof counts] || 0;
  });

  ngOnInit(): void {
    this.loadDashboardSummary();
  }

  /**
   * Load dashboard summary
   */
  private loadDashboardSummary(): void {
    this.searchService.getDashboardSummary().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.dashboardSummary.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading dashboard summary:', error);
        this.alertService.error('Failed to load dashboard summary');
      },
    });
  }

  /**
   * Perform global search
   */
  performSearch(): void {
    this.loading.set(true);
    this.hasSearched.set(true);
    this.currentPage.set(1);

    const params = {
      search: this.searchText(),
      entity: this.selectedEntity(),
      status: this.selectedStatus() || undefined,
      startDate: this.startDate(),
      endDate: this.endDate(),
      page: this.currentPage(),
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    this.searchService.globalSearch(params).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response.success && response.data) {
          this.searchResults.set(response.data.results);
          this.pagination.set(response.data.pagination);
        } else {
          this.searchResults.set({});
          this.alertService.warning('No results found');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Search error:', error);
        this.alertService.error('Search failed. Please try again.');
      },
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchText.set('');
    this.selectedEntity.set('all');
    this.selectedStatus.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.sortBy.set('createdAt');
    this.sortOrder.set('desc');
    this.currentPage.set(1);
    this.searchResults.set({});
    this.hasSearched.set(false);
  }

  /**
   * Apply date range preset
   */
  applyDatePreset(preset: any): void {
    const dates = preset.getDates();
    this.startDate.set(dates.start);
    this.endDate.set(dates.end);
  }

  /**
   * Pagination
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination().totalPages) {
      this.currentPage.set(page);
      this.performSearch();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.pagination().totalPages) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  /**
   * Date Helper Functions
   */
  private getToday() {
    const today = new Date();
    return {
      start: today.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }

  private getYesterday() {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    return {
      start: yesterday.toISOString().split('T')[0],
      end: yesterday.toISOString().split('T')[0],
    };
  }

  private getCurrentWeek() {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    const start = new Date(now.setDate(first));
    const end = new Date(now.setDate(first + 6));

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private getPreviousWeek() {
    const now = new Date();
    const first = now.getDate() - now.getDay() - 7;
    const start = new Date(now.setDate(first));
    const end = new Date(now.setDate(first + 6));

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private getCurrentMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private getPreviousMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private getCurrentYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
      case 'verified':
      case 'joined':
        return 'bg-success';
      case 'inactive':
      case 'suspended':
        return 'bg-danger';
      case 'pending':
      case 'invited':
        return 'bg-warning';
      case 'unverified':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  }

  /**
   * Get role badge class
   */
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-primary';
      case 'company':
        return 'bg-success';
      case 'employee':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }
}
