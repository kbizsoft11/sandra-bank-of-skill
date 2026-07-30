import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

import { UserService } from '../../core/services/user.service';
import { SkillService } from '../../core/services/skill.service';
import { CompanySkillCategoryService } from '../../core/services/company-skill-category.service';
import { SkillCategoryService } from '../../core/services/skill-category.service';
import { AlertService } from '../../core/services/alert.service';
import { CompanySkillCategoryMapping, SkillCategory } from '../../shared/interfaces/skill-category.interface';

interface CompanySkill {
  _id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: {
    _id: string;
    name: string;
  };
  status: 'active' | 'inactive';
  createdType: 'ADMIN' | 'COMPANY';
  companyId?: string;
  archived?: boolean;
}

function getDecimal(value: number): number {
  return Number(value.toFixed(1));
}

@Component({
  selector: 'app-company-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './company-skills.html',
  styleUrl: './company-skills.scss',
})
export class CompanySkills implements OnInit, AfterViewInit, OnDestroy {

  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly skillService = inject(SkillService);
  private readonly companySkillCategoryService = inject(CompanySkillCategoryService);
  private readonly skillCategoryService = inject(SkillCategoryService);
  private readonly alertService = inject(AlertService);

  @ViewChild('skillsTable', { static: false }) skillsTable!: ElementRef;

  // Expose Math for template
  Math = Math;

  // State
  skills = signal<CompanySkill[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  selectedCategoryFilter = signal<string>('');
  selectedStatusFilter = signal<string>('');
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Categories
  availableCategories = signal<(CompanySkillCategoryMapping | SkillCategory)[]>([]);
  isLoadingCategories = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modal state
  showEmployeesModal = signal<boolean>(false);
  selectedSkill = signal<CompanySkill | null>(null);

  readonly filteredAndSortedSkills = computed(() => {
    let filtered = [...this.skills()];

    // Apply sorting
    const column = this.sortColumn();
    const direction = this.sortDirection();

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      if (column === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (column === 'category') {
        aVal = (a.category?.name || '').toLowerCase();
        bVal = (b.category?.name || '').toLowerCase();
      } else if (column === 'status') {
        aVal = a.status;
        bVal = b.status;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  readonly paginatedSkills = computed(() => {
    const sorted = this.filteredAndSortedSkills();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return sorted.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredAndSortedSkills().length / this.pageSize());
  });

  readonly totalSkills = computed(() => {
    return this.skills().length;
  });

  readonly hasSkills = computed(() => {
    return this.skills().length > 0;
  });

  ngOnInit(): void {
    // Check if called from category view with categoryId query param
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['categoryId']) {
        this.selectedCategoryFilter.set(params['categoryId']);
      }
    });
    
    this.loadCategories();
    this.loadSkills();
  }

  ngAfterViewInit(): void {
    // No DataTables initialization needed - using Angular's native rendering
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadCategories(): void {
    this.isLoadingCategories.set(true);

    Promise.all([
      this.companySkillCategoryService.getAll().toPromise(),
      this.skillCategoryService.getAll({ limit: 100 }).toPromise()
    ]).then(([mappingsResponse, categoriesResponse]) => {
      const mappings = mappingsResponse?.data as CompanySkillCategoryMapping[] || [];
      const result = categoriesResponse?.data as any || {};
      let allCategories: SkillCategory[] = [];
      
      if (Array.isArray(result)) {
        allCategories = result;
      } else if (result.categories && Array.isArray(result.categories)) {
        allCategories = result.categories;
      }

      // Combine mappings (selected admin) and own categories
      const combined: (CompanySkillCategoryMapping | SkillCategory)[] = [];
      
      // Add mappings first
      combined.push(...mappings);
      
      // Add own categories
      const ownCats = allCategories.filter((cat: any) => cat.createdType === 'COMPANY');
      combined.push(...ownCats);

      this.availableCategories.set(combined);
      this.isLoadingCategories.set(false);
    }).catch(() => {
      this.alertService.error('Failed to load categories');
      this.isLoadingCategories.set(false);
    });
  }

  loadSkills(): void {
    this.isLoading.set(true);

    // Build query params - no limit since we're doing client-side pagination
    const query: any = {
      limit: 1000  // Fetch up to 1000 skills for client-side pagination
    };

    if (this.searchTerm()) {
      query.search = this.searchTerm();
    }

    if (this.selectedCategoryFilter()) {
      query.categoryId = this.selectedCategoryFilter();
    }

    if (this.selectedStatusFilter()) {
      query.status = this.selectedStatusFilter();
    }

    this.skillService.getSkills(query).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        if (response.success && response.data) {
          const data = response.data as any;
          const skillsList = data.skills || data || [];
          console.log('✅ Skills loaded:', skillsList.length, 'skills');
          console.log('Backend response:', response);
          this.skills.set(skillsList);
        } else {
          console.log('❌ No data in response');
          this.skills.set([]);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('❌ Error loading skills:', error);
        this.alertService.error('Failed to load company skills. Please try again.');
      },
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.loadSkills();
  }

  onCategoryFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryFilter.set(value);
    this.currentPage.set(1);
    this.loadSkills();
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatusFilter.set(value);
    this.currentPage.set(1);
    this.loadSkills();
  }

  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) {
      return 'bi-arrow-down-up';
    }
    return this.sortDirection() === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push(-1);
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1);
      }

      pages.push(total);
    }

    return pages;
  }

  deleteSkill(skill: CompanySkill): void {
    Swal.fire({
      title: 'Delete Skill?',
      text: `Are you sure you want to delete "${skill.name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.skillService.deleteSkill(skill._id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Deleted!',
              text: 'Skill has been deleted successfully.',
              icon: 'success',
              timer: 2000,
            });
            this.loadSkills();
          },
          error: (error) => {
            console.error('Error deleting skill:', error);
            Swal.fire({
              title: 'Error!',
              text: error?.error?.message || 'Failed to delete skill. Please try again.',
              icon: 'error',
            });
          },
        });
      }
    });
  }

  toggleSkillStatus(skill: CompanySkill): void {
    const newStatus = skill.status === 'active' ? 'inactive' : 'active';
    
    this.skillService.updateSkill(skill._id, { status: newStatus } as any).subscribe({
      next: () => {
        Swal.fire({
          title: 'Success!',
          text: `Skill marked as ${newStatus}.`,
          icon: 'success',
          timer: 1500,
        });
        this.loadSkills();
      },
      error: (error) => {
        console.error('Error updating skill status:', error);
        Swal.fire({
          title: 'Error!',
          text: error?.error?.message || 'Failed to update skill status. Please try again.',
          icon: 'error',
        });
      },
    });
  }

  closeModal(): void {
    this.showEmployeesModal.set(false);
    this.selectedSkill.set(null);
  }

  getCategoryId(category: CompanySkillCategoryMapping | SkillCategory): string {
    const cat = category as any;
    // For mappings: return skillCategoryId (the actual admin category ID)
    if (cat.skillCategoryId) {
      return cat.skillCategoryId;
    }
    // For skill categories: return _id
    return cat._id || cat.categoryId || '';
  }

  getCategoryDisplayName(category: CompanySkillCategoryMapping | SkillCategory): string {
    const cat = category as any;
    return cat.name || cat.displayName || '';
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'active') return 'bg-success';
    return 'bg-secondary';
  }

}
