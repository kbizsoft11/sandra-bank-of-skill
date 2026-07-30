import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AlertService } from '../../../core/services/alert.service';

import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

import { TableActions } from '../../../shared/components/table-actions/table-actions';

@Component({
  selector: 'app-skill-category-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TableActions
  ],
  templateUrl: './skill-category-list.html',
})
export class SkillCategoryList implements OnInit {

  private readonly skillCategoryService = inject(SkillCategoryService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Data signals
  readonly categories = signal<SkillCategory[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Pagination signals
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalCategories = signal(0);

  // Filter signals
  readonly searchForm = signal<FormGroup | null>(null);
  readonly statusFilter = signal<string>('');
  readonly typeFilter = signal<string>(''); // ADMIN | COMPANY | empty (all)
  readonly updatingStatusId = signal<string | null>(null);

  // Computed values
  readonly totalPages = computed(() => {
    return Math.ceil(this.totalCategories() / this.pageSize());
  });

  readonly displayedCategories = computed(() => {
    return this.categories();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
  }

  private initializeForm(): void {
    const form = this.fb.group({
      search: [''],
    });
    this.searchForm.set(form);
  }

  loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchForm()?.get('search')?.value || undefined,
      status: this.statusFilter() || undefined,
    };

    // Add type filter if selected
    if (this.typeFilter()) {
      params.createdType = this.typeFilter();
    }

    this.skillCategoryService.getAll(params).subscribe({
      next: (response) => {
        if (response?.data) {
          // Handle both array and paginated responses
          if (Array.isArray(response.data)) {
            this.categories.set(response.data);
            this.totalCategories.set(response.data.length);
          } else if (response.data.categories) {
            this.categories.set(response.data.categories);
            this.totalCategories.set(response.data.pagination?.total || response.data.categories.length);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.error.set('Failed to load categories');
        this.alertService.error('Failed to load categories');
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCategories();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadCategories();
  }

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.typeFilter.set(value);
    this.currentPage.set(1);
    this.loadCategories();
  }

  onPageSizeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
    this.loadCategories();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadCategories();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  editCategory(category: SkillCategory): void {
    this.router.navigate([
      '/admin/skill-categories',
      category._id,
      'edit'
    ]);
  }

  viewCategorySkills(category: SkillCategory): void {
    this.router.navigate([
      '/admin/skill-categories',
      category._id,
      'skills'
    ]);
  }

  deleteCategory(category: SkillCategory): void {
    this.alertService.confirmDelete(category.name).then((confirmed) => {
      if (confirmed) {
        this.skillCategoryService.delete(category._id).subscribe({
          next: () => {
            this.loadCategories();
            this.alertService.toast('Category deleted successfully', 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to delete category. Please try again.');
          }
        });
      }
    });
  }

  toggleCategoryStatus(category: SkillCategory): void {
    const newStatus = category.status === 'active' ? 'inactive' : 'active';
    const statusText = newStatus === 'active' ? 'activate' : 'deactivate';

    this.alertService.confirm(
      `Are you sure you want to ${statusText} "${category.name}"?`,
      `This category will be marked as ${newStatus}.`,
      `Yes, ${statusText}`,
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.updatingStatusId.set(category._id);
        this.skillCategoryService.update(category._id, { status: newStatus }).subscribe({
          next: () => {
            this.alertService.success(`Category ${statusText}d successfully`);
            this.loadCategories();
            this.updatingStatusId.set(null);
          },
          error: (err) => {
            console.error('Error updating category status:', err);
            this.alertService.error(`Failed to ${statusText} category`);
            this.updatingStatusId.set(null);
          },
        });
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    return status === 'active' ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis';
  }

  getStatusText(status: string): string {
    return status === 'active' ? 'Active' : 'Inactive';
  }

  getTypeBadgeClass(createdType: string): string {
    return createdType === 'ADMIN' ? 'bg-primary-subtle text-primary-emphasis' : 'bg-info-subtle text-info-emphasis';
  }

  getOwnerDisplay(category: SkillCategory): string {
    if (category.createdType === 'ADMIN') {
      return 'Admin';
    } else if (category.companyId && typeof category.companyId === 'object' && 'company_name' in category.companyId) {
      return (category.companyId as any).company_name;
    } else {
      return 'Company';
    }
  }

}