import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AlertService } from '../../../core/services/alert.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

interface CategoryToggle {
  categoryId: string;
  categoryName: string;
  description?: string;
  enabled: boolean;
  loading?: boolean;
}

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './manage-categories.html',
  styleUrls: ['./manage-categories.scss'],
})
export class ManageCategoriesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly alertService = inject(AlertService);
  private readonly apiUrl = API_CONFIG.BASE_URL;

  // Signals
  allCategories = signal<CategoryToggle[]>([]);
  loading = signal(true);
  searchFilter = signal('');
  selectedTab = signal<'all' | 'enabled' | 'disabled'>('all');

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Load all admin categories and company's enabled status
   */
  loadCategories(): void {
    this.loading.set(true);

    // Get all admin categories
    this.http.get<any>(`${this.apiUrl}/skill-categories?createdType=ADMIN`).subscribe({
      next: (response) => {
        const adminCategories = response.data || [];

        // Get company's enabled categories
        this.http.get<any>(`${this.apiUrl}/company-categories/company/enabled`).subscribe({
          next: (companyResponse) => {
            const enabledIds = new Set(
              (companyResponse.data || []).map((cat: any) => cat.categoryId)
            );

            const categoryToggles: CategoryToggle[] = adminCategories.map(
              (cat: SkillCategory) => ({
                categoryId: cat._id,
                categoryName: cat.name,
                description: cat.description,
                enabled: enabledIds.has(cat._id),
              })
            );

            this.allCategories.set(categoryToggles);
            this.loading.set(false);
          },
          error: (err: any) => {
            console.error('Failed to load enabled categories:', err);
            this.loading.set(false);
            this.alertService.error('Failed to load category settings');
          },
        });
      },
      error: (err: any) => {
        console.error('Failed to load skill categories:', err);
        this.loading.set(false);
        this.alertService.error('Failed to load skill categories');
      },
    });
  }

  /**
   * Filter categories based on search and tab
   */
  get filteredCategories(): CategoryToggle[] {
    let filtered = this.allCategories();
    const search = this.searchFilter().toLowerCase();
    const tab = this.selectedTab();

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (cat) =>
          cat.categoryName.toLowerCase().includes(search) ||
          (cat.description?.toLowerCase().includes(search) || false)
      );
    }

    // Filter by tab
    if (tab === 'enabled') {
      filtered = filtered.filter((cat) => cat.enabled);
    } else if (tab === 'disabled') {
      filtered = filtered.filter((cat) => !cat.enabled);
    }

    return filtered;
  }

  /**
   * Get count for each tab
   */
  getTabCount(tab: 'all' | 'enabled' | 'disabled'): number {
    const categories = this.allCategories();

    if (tab === 'all') return categories.length;
    if (tab === 'enabled') return categories.filter((c) => c.enabled).length;
    if (tab === 'disabled') return categories.filter((c) => !c.enabled).length;

    return 0;
  }

  /**
   * Toggle category enabled/disabled
   */
  toggleCategory(category: CategoryToggle): void {
    if (category.loading) return;

    category.loading = true;

    if (category.enabled) {
      // Disable category
      this.disableCategory(category);
    } else {
      // Enable category
      this.enableCategory(category);
    }
  }

  /**
   * Enable a single category
   */
  private enableCategory(category: CategoryToggle): void {
    // First, get or create the company-category mapping
    this.http
      .post<any>(`${this.apiUrl}/company-categories`, { categoryId: category.categoryId })
      .subscribe({
        next: (response) => {
          const mappingId = response.data?._id;

          if (!mappingId) {
            category.loading = false;
            this.alertService.error('Failed to enable category');
            return;
          }

          // Then enable it
          this.http.patch<any>(`${this.apiUrl}/company-categories/${mappingId}/enable`, {}).subscribe({
            next: () => {
              category.enabled = true;
              category.loading = false;
              this.alertService.toast(
                `${category.categoryName} enabled successfully`,
                'success'
              );
            },
            error: (err: any) => {
              console.error('Failed to enable category:', err);
              category.loading = false;
              this.alertService.error(`Failed to enable ${category.categoryName}`);
            },
          });
        },
        error: (err: any) => {
          // If mapping already exists, just enable it
          if (err.status === 409) {
            this.http
              .get<any>(`${this.apiUrl}/company-categories/company/all?categoryId=${category.categoryId}`)
              .subscribe({
                next: (response) => {
                  const mapping = response.data?.[0];
                  if (mapping) {
                    this.http.patch<any>(`${this.apiUrl}/company-categories/${mapping._id}/enable`, {}).subscribe({
                      next: () => {
                        category.enabled = true;
                        category.loading = false;
                        this.alertService.toast(
                          `${category.categoryName} enabled successfully`,
                          'success'
                        );
                      },
                      error: () => {
                        category.loading = false;
                        this.alertService.error(`Failed to enable ${category.categoryName}`);
                      },
                    });
                  }
                },
                error: () => {
                  category.loading = false;
                  this.alertService.error(`Failed to enable ${category.categoryName}`);
                },
              });
          } else {
            category.loading = false;
            this.alertService.error(`Failed to enable ${category.categoryName}`);
          }
        },
      });
  }

  /**
   * Disable a single category
   */
  private disableCategory(category: CategoryToggle): void {
    // Get the mapping ID first
    this.http
      .get<any>(`${this.apiUrl}/company-categories/company/all?categoryId=${category.categoryId}`)
      .subscribe({
        next: (response) => {
          const mapping = response.data?.[0];

          if (!mapping?._id) {
            category.loading = false;
            this.alertService.error('Failed to disable category');
            return;
          }

          // Disable it
          this.http.patch<any>(`${this.apiUrl}/company-categories/${mapping._id}/disable`, {}).subscribe({
            next: () => {
              category.enabled = false;
              category.loading = false;
              this.alertService.toast(
                `${category.categoryName} disabled successfully`,
                'success'
              );
            },
            error: (err: any) => {
              console.error('Failed to disable category:', err);
              category.loading = false;
              this.alertService.error(`Failed to disable ${category.categoryName}`);
            },
          });
        },
        error: (err: any) => {
          console.error('Failed to get category mapping:', err);
          category.loading = false;
          this.alertService.error(`Failed to disable ${category.categoryName}`);
        },
      });
  }

  /**
   * Enable all categories
   */
  enableAll(): void {
    const disabledCategories = this.allCategories().filter((c) => !c.enabled);

    if (disabledCategories.length === 0) {
      this.alertService.toast('All categories are already enabled', 'info');
      return;
    }

    const categoryIds = disabledCategories.map((c) => c.categoryId);

    this.http.post<any>(`${this.apiUrl}/company-categories/bulk/enable`, { categoryIds }).subscribe({
      next: () => {
        disabledCategories.forEach((cat) => (cat.enabled = true));
        this.alertService.toast('All categories enabled successfully', 'success');
      },
      error: (err: any) => {
        console.error('Failed to enable categories:', err);
        this.alertService.error('Failed to enable categories');
      },
    });
  }

  /**
   * Disable all categories
   */
  disableAll(): void {
    const enabledCategories = this.allCategories().filter((c) => c.enabled);

    if (enabledCategories.length === 0) {
      this.alertService.toast('All categories are already disabled', 'info');
      return;
    }

    const categoryIds = enabledCategories.map((c) => c.categoryId);

    this.http.post<any>(`${this.apiUrl}/company-categories/bulk/disable`, { categoryIds }).subscribe({
      next: () => {
        enabledCategories.forEach((cat) => (cat.enabled = false));
        this.alertService.toast('All categories disabled successfully', 'success');
      },
      error: (err: any) => {
        console.error('Failed to disable categories:', err);
        this.alertService.error('Failed to disable categories');
      },
    });
  }

  /**
   * Reset to default (all enabled)
   */
  resetToDefault(): void {
    if (confirm('Are you sure you want to reset to default (enable all categories)?')) {
      this.enableAll();
    }
  }
}
