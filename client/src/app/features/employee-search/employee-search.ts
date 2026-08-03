import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { API_CONFIG } from '../../core/config/api.config';

interface EmployeeSearchResult {
  _id: string;
  fullName: string;
  email: string;
  department?: string;
  location?: string;
  title?: string;
  profileImage?: string;
  organisation?: {
    organisationName: string;
  };
  skills: Array<{
    _id: string;
    name: string;
    categoryId: string;
  }>;
  skillUsers: Array<{
    skillId: string;
    score: number;
    level: string;
  }>;
  skillCategories: Array<{
    _id: string;
    name: string;
  }>;
}

interface SearchPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-employee-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './employee-search.html',
  styleUrl: './employee-search.scss',
})
export class EmployeeSearch implements OnInit {

  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  readonly auth = inject(AuthService);

  // Search parameters
  searchText = signal<string>('');
  skillFilter = signal<string>('');
  categoryFilter = signal<string>('');
  departmentFilter = signal<string>('');

  // Results and state
  employees = signal<EmployeeSearchResult[]>([]);
  pagination = signal<SearchPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  // Computed properties
  readonly hasFilters = computed(() => {
    return !!(
      this.searchText() ||
      this.skillFilter() ||
      this.categoryFilter() ||
      this.departmentFilter()
    );
  });

  readonly hasResults = computed(() => {
    return this.employees().length > 0;
  });

  ngOnInit(): void {
    // Optionally load initial results
    // this.performSearch();
  }

  performSearch(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);

    const params: any = {
      page: this.pagination().page,
      limit: this.pagination().limit,
    };

    if (this.searchText()) {
      params.search = this.searchText();
    }
    if (this.skillFilter()) {
      params.skill = this.skillFilter();
    }
    if (this.categoryFilter()) {
      params.category = this.categoryFilter();
    }
    if (this.departmentFilter()) {
      params.department = this.departmentFilter();
    }

    this.userService.searchEmployees(params).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        if (response.success && response.data) {
          this.employees.set(response.data.employees || []);
          this.pagination.set(response.data.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          });
        } else {
          this.employees.set([]);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Search error:', error);
        this.alertService.error('Failed to search employees. Please try again.');
      },
    });
  }

  clearFilters(): void {
    this.searchText.set('');
    this.skillFilter.set('');
    this.categoryFilter.set('');
    this.departmentFilter.set('');
    this.employees.set([]);
    this.hasSearched.set(false);
    this.pagination.set({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  }

  goToPage(page: number): void {
    const currentPagination = this.pagination();
    this.pagination.set({
      ...currentPagination,
      page: page,
    });
    this.performSearch();
  }

  nextPage(): void {
    const currentPagination = this.pagination();
    if (currentPagination.page < currentPagination.totalPages) {
      this.goToPage(currentPagination.page + 1);
    }
  }

  previousPage(): void {
    const currentPagination = this.pagination();
    if (currentPagination.page > 1) {
      this.goToPage(currentPagination.page - 1);
    }
  }

  getProfileImageUrl(employee: EmployeeSearchResult): string {
    if (employee.profileImage) {
      return `${API_CONFIG.SERVER_URL}${employee.profileImage}`;
    }
    return '';
  }

  getInitials(fullName: string): string {
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471ed', '#12c2e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getSkillLevelClass(level: string): string {
    const levelLower = level.toLowerCase();
    if (levelLower === 'expert') return 'bg-success';
    if (levelLower === 'advanced') return 'bg-info';
    if (levelLower === 'intermediate') return 'bg-warning';
    return 'bg-secondary';
  }

  getUniqueSkillNames(employee: EmployeeSearchResult): string[] {
    return [...new Set(employee.skills.map(s => s.name))].slice(0, 5);
  }

  getUniqueCategoryNames(employee: EmployeeSearchResult): string[] {
    return [...new Set(employee.skillCategories.map(c => c.name))].slice(0, 3);
  }

  viewEmployeeSkills(employeeId: string): void {
    const role = this.auth.role();
    // Navigation will be handled by routerLink in template
  }

}
