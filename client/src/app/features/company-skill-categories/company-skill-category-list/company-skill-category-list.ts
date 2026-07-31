import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CompanySkillCategoryService } from '../../../core/services/company-skill-category.service';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { SkillService } from '../../../core/services/skill.service';
import { AlertService } from '../../../core/services/alert.service';
import { CompanySkillCategoryMapping, SkillCategory } from '../../../shared/interfaces/skill-category.interface';

@Component({
  selector: 'app-company-skill-category-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './company-skill-category-list.html',
})
export class CompanySkillCategoryList implements OnInit {
  private readonly router = inject(Router);
  private readonly companyService = inject(CompanySkillCategoryService);
  private readonly categoryService = inject(SkillCategoryService);
  private readonly skillService = inject(SkillService);
  private readonly alertService = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  // Data signals
  companyCategoryMappings = signal<CompanySkillCategoryMapping[]>([]);
  ownCategories = signal<SkillCategory[]>([]);
  adminCategories = signal<any[]>([]);
  isLoading = signal(false);

  // Modal signals
  selectedCategory = signal<(CompanySkillCategoryMapping | SkillCategory) | null>(null);
  showEditModal = signal(false);
  showCreateModal = signal(false);
  showSelectAdminModal = signal(false);

  // Admin categories modal state
  adminModalPage = signal(1);
  adminModalPageSize = signal(10);
  adminModalSearchTerm = signal('');
  adminModalTotalPages = signal(1);
  adminModalIsLoading = signal(false);
  adminModalCategories = signal<any[]>([]);

  // Forms
  editForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  createForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  searchControl = new FormControl('');

  // Manage Skills Modal signals
  showManageSkillsModal = signal(false);
  companySkillsForManage = signal<any[]>([]);

  // Drag and drop signals
  draggedSkill = signal<any | null>(null);
  dragOverCategoryId = signal<string | null>(null);
  dragOverOrphanZone = signal(false);

  // Search and Filter
  skillSearchTerm = signal('');
  categorySearchTerm = signal('');
  skillSortBy = signal<'name' | 'category' | 'status'>('name');

  // Skills Pagination
  skillsCurrentPage = signal(1);
  skillsPageSize = signal(10);

  readonly filteredCategories = computed(() => {
    // ONLY show company-created categories (not admin categories)
    let categories = [...this.ownCategories()];

    // Search filter for categories
    if (this.categorySearchTerm()) {
      const searchLower = this.categorySearchTerm().toLowerCase();
      return categories.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        (c.description || '').toLowerCase().includes(searchLower)
      );
    }

    return categories;
  });

  readonly filteredCompanySkills = computed(() => {
    // Filter to show only company-created skills in the left panel
    let skills = this.companySkillsForManage().filter((s: any) => s.createdType === 'COMPANY');

    // Search filter
    if (this.skillSearchTerm()) {
      const searchLower = this.skillSearchTerm().toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        (s.category?.name || '').toLowerCase().includes(searchLower)
      );
    }

    // Sort - PRIMARY: by createdType (COMPANY first), SECONDARY: by selected column
    const sortBy = this.skillSortBy();
    skills.sort((a, b) => {
      // Primary sort: COMPANY skills first
      if (a.createdType === 'COMPANY' && b.createdType !== 'COMPANY') return -1;
      if (a.createdType !== 'COMPANY' && b.createdType === 'COMPANY') return 1;
      
      // Secondary sort: by selected column
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'category') {
        const catA = (a.category?.name || '').toLowerCase();
        const catB = (b.category?.name || '').toLowerCase();
        return catA.localeCompare(catB);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

    return skills;
  });

  readonly paginatedCompanySkills = computed(() => {
    const filtered = this.filteredCompanySkills();
    const start = (this.skillsCurrentPage() - 1) * this.skillsPageSize();
    const end = start + this.skillsPageSize();
    return filtered.slice(start, end);
  });

  readonly skillsTotalPages = computed(() => {
    return Math.ceil(this.filteredCompanySkills().length / this.skillsPageSize());
  });

  ngOnInit(): void {
    this.loadAllCategories();
  }

  loadAllCategories(): void {
    this.isLoading.set(true);
    
    Promise.all([
      this.companyService.getAll().toPromise(),
      this.categoryService.getAll({ limit: 100 }).toPromise()
    ]).then(([mappingsResponse, categoriesResponse]) => {
      // Company category mappings
      const mappings = mappingsResponse?.data || [];
      this.companyCategoryMappings.set(mappings);

      // Parse categories response
      const result = categoriesResponse?.data as any || {};
      let allCategories: SkillCategory[] = [];
      
      if (Array.isArray(result)) {
        allCategories = result;
      } else if (result.categories && Array.isArray(result.categories)) {
        allCategories = result.categories;
      }

      // Separate admin and company categories
      const own = allCategories.filter((cat: any) => cat.createdType === 'COMPANY');
      const admin = allCategories.filter((cat: any) => cat.createdType === 'ADMIN');
      this.ownCategories.set(own);
      this.adminCategories.set(admin);
      this.isLoading.set(false);
    }).catch(() => {
      this.alertService.error('Failed to load categories');
      this.isLoading.set(false);
    });
  }

  // Admin category selection
  openSelectAdminModal(): void {
    this.adminModalPage.set(1);
    this.adminModalSearchTerm.set('');
    this.loadAdminCategoriesModal();
    this.showSelectAdminModal.set(true);
  }

  closeSelectAdminModal(): void {
    this.showSelectAdminModal.set(false);
  }

  loadAdminCategoriesModal(): void {
    this.adminModalIsLoading.set(true);
    
    this.companyService.getAvailableAdminCategories({
      page: this.adminModalPage(),
      limit: this.adminModalPageSize(),
      search: this.adminModalSearchTerm()
    }).subscribe({
      next: (response) => {
        const data = response.data as any;
        this.adminModalCategories.set(data.categories || []);
        this.adminModalTotalPages.set(data.pages || 1);
        this.adminModalIsLoading.set(false);
      },
      error: () => {
        this.alertService.error('Failed to load admin categories');
        this.adminModalIsLoading.set(false);
      }
    });
  }

  onAdminModalSearch(): void {
    this.adminModalPage.set(1);
    this.loadAdminCategoriesModal();
  }

  goToAdminModalPage(page: number): void {
    if (page >= 1 && page <= this.adminModalTotalPages()) {
      this.adminModalPage.set(page);
      this.loadAdminCategoriesModal();
    }
  }

  previousAdminModalPage(): void {
    if (this.adminModalPage() > 1) {
      this.adminModalPage.update(p => p - 1);
      this.loadAdminCategoriesModal();
    }
  }

  nextAdminModalPage(): void {
    if (this.adminModalPage() < this.adminModalTotalPages()) {
      this.adminModalPage.update(p => p + 1);
      this.loadAdminCategoriesModal();
    }
  }

  getAdminModalPageNumbers(): number[] {
    const total = this.adminModalTotalPages();
    const current = this.adminModalPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }

    return pages;
  }

  selectAdminCategory(category: any): void {
    // Check if already selected
    const alreadyMapped = this.companyCategoryMappings().find(
      (m: any) => m.categoryId === category._id
    );

    if (alreadyMapped) {
      this.alertService.warning('This category is already selected');
      return;
    }

    // Create mapping
    this.companyService.create({
      skillCategoryId: category._id,
      displayName: category.name
    }).subscribe({
      next: () => {
        this.alertService.toast('Category selected successfully', 'success');
        this.loadAdminCategoriesModal(); // Refresh to show updated status
        this.loadAllCategories(); // Refresh main list
      },
      error: () => {
        this.alertService.error('Failed to select category');
      }
    });
  }

  // Create company category
  openCreateModal(): void {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset();
  }

  saveNewCategory(): void {
    if (this.createForm.invalid) {
      Object.keys(this.createForm.controls).forEach(key => {
        this.createForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.createForm.value;
    
    this.categoryService.create({
      name: formData.name?.trim() || '',
      description: formData.description?.trim() || ''
    }).subscribe({
      next: () => {
        this.alertService.toast('Category created successfully', 'success');
        this.closeCreateModal();
        this.loadAllCategories();
      },
      error: () => {
        this.alertService.error('Failed to create category');
      }
    });
  }

  // Edit category
  openEditModal(category: SkillCategory): void {
    this.selectedCategory.set(category);
    this.editForm.patchValue({
      name: category.name,
      description: category.description || ''
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedCategory.set(null);
    this.editForm.reset();
  }

  saveCategory(): void {
    if (this.editForm.invalid || !this.selectedCategory()) {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }

    const category = this.selectedCategory() as SkillCategory;
    const formData = this.editForm.value;

    this.categoryService.update(category._id, {
      name: formData.name?.trim() || '',
      description: formData.description?.trim() || ''
    }).subscribe({
      next: () => {
        this.alertService.toast('Category updated successfully', 'success');
        this.closeEditModal();
        this.loadAllCategories();
      },
      error: () => {
        this.alertService.error('Failed to update category');
      }
    });
  }

  // Delete category
  deleteCategory(category: SkillCategory): void {
    this.alertService.confirmDelete(category.name).then((confirmed) => {
      if (confirmed) {
        this.categoryService.delete(category._id).subscribe({
          next: () => {
            this.alertService.toast('Category deleted successfully', 'success');
            this.loadAllCategories();
          },
          error: () => {
            this.alertService.error('Failed to delete category');
          }
        });
      }
    });
  }

  // Remove mapping (unselect admin category)
  removeMapping(mappingId: string | undefined): void {
    if (!mappingId) {
      this.alertService.error('Invalid mapping ID');
      return;
    }

    this.alertService.confirm(
      'Remove this category?',
      'Are you sure you want to remove this selected category from your company?'
    ).then((confirmed) => {
      if (confirmed) {
        this.companyService.delete(mappingId).subscribe({
          next: () => {
            this.alertService.toast('Category removed successfully', 'success');
            this.loadAllCategories();
          },
          error: () => {
            this.alertService.error('Failed to remove category');
          }
        });
      }
    });
  }

  isCompanyCategory(category: any): boolean {
    return category.createdType === 'COMPANY';
  }

  viewCategorySkills(category: CompanySkillCategoryMapping | SkillCategory): void {
    const cat = category as any;
    const categoryId = cat.skillCategoryId || cat._id;
    
    if (!categoryId) {
      this.alertService.error('Invalid category ID');
      return;
    }

    // Navigate to company skills page with category filter
    this.router.navigate(['/company/company-skills'], {
      queryParams: {
        categoryId: categoryId,
        categoryName: cat.displayName || cat.name
      }
    });
  }

  // Manage Skills Modal Methods
  openManageSkillsModal(): void {
    this.showManageSkillsModal.set(true);
    this.loadCompanySkillsForManage();
  }

  closeManageSkillsModal(): void {
    this.showManageSkillsModal.set(false);
    this.companySkillsForManage.set([]);
    this.skillSearchTerm.set('');
    this.categorySearchTerm.set('');
    this.draggedSkill.set(null);
    this.dragOverCategoryId.set(null);
    this.dragOverOrphanZone.set(false);
    this.skillsCurrentPage.set(1);
  }

  onSkillSearch(): void {
    this.skillsCurrentPage.set(1); // Reset to first page on search
  }

  onCategorySearch(): void {
    // Filter happens automatically via computed signal
  }

  setSkillSort(sortBy: 'name' | 'category' | 'status'): void {
    this.skillSortBy.set(sortBy);
    this.skillsCurrentPage.set(1);
  }

  getSkillCountInCategory(categoryId: string): number {
    if (!categoryId) return 0;
    
    const skills = this.companySkillsForManage();
    
    // Debug: log on first call
    if (skills.length > 0) {
      console.log('=== SKILL COUNT DEBUG ===');
      console.log('Looking for categoryId:', categoryId);
      console.log('Total skills loaded:', skills.length);
      console.log('First 3 skills structure:');
      skills.slice(0, 3).forEach((s, idx) => {
        console.log(`  Skill ${idx}: name=${s.name}, categoryId=${s.categoryId}, category=${JSON.stringify(s.category)}`);
      });
    }
    
    // Count skills where categoryId matches
    const count = skills.filter(s => {
      if (!s) return false;
      
      // Match 1: skill.categoryId is a string and equals the category._id
      if (typeof s.categoryId === 'string' && s.categoryId === categoryId) {
        return true;
      }
      
      // Match 2: skill.categoryId is an object with _id field
      if (typeof s.categoryId === 'object' && s.categoryId?._id === categoryId) {
        return true;
      }
      
      // Match 3: skill.category is populated (from backend response)
      if (s.category && typeof s.category === 'object' && s.category._id === categoryId) {
        return true;
      }
      
      return false;
    }).length;
    
    if (count === 0 && skills.length > 0) {
      console.log(`No skills found for categoryId: ${categoryId}`);
    }
    
    return count;
  }

  /** Get skill count for a company category mapping (which has skillCategoryId pointing to admin category) */
  getSkillCountForMapping(mapping: any): number {
    const categoryId = mapping.skillCategoryId || mapping.categoryId;
    const count = this.getSkillCountInCategory(categoryId);
    
    // Debug logging
    console.log(`Mapping: ${mapping.displayName}, categoryId: ${categoryId}, skills loaded: ${this.companySkillsForManage().length}, count: ${count}`);
    
    return count;
  }

  loadCompanySkillsForManage(): void {
    console.log('🔄 Loading company skills for manage modal...');
    this.skillService.getSkills({ limit: '1000' }).subscribe({
      next: (response) => {
        console.log('📡 Full API Response:', response);
        console.log('Response.success:', response.success);
        console.log('Response.data type:', typeof response.data);
        console.log('Response.data:', response.data);
        
        if (response.success && response.data) {
          const data = response.data as any;
          console.log('data.skills:', data.skills);
          console.log('data keys:', Object.keys(data));
          
          let allSkills = data.skills || data || [];
          console.log('✅ Skills extracted:', allSkills.length, 'skills');
          
          if (allSkills.length > 0) {
            console.log('First skill:', allSkills[0]);
          }
          
          // Sort by createdType: COMPANY first, then ADMIN
          allSkills = allSkills.sort((a: any, b: any) => {
            if (a.createdType === 'COMPANY' && b.createdType !== 'COMPANY') return -1;
            if (a.createdType !== 'COMPANY' && b.createdType === 'COMPANY') return 1;
            return 0;
          });
          
          // Load ALL company-accessible skills (both company-created AND admin skills in accessible categories)
          this.companySkillsForManage.set(allSkills);
        } else {
          console.log('❌ Response not successful or no data');
          this.companySkillsForManage.set([]);
        }
      },
      error: (error) => {
        console.error('❌ Failed to load skills:', error);
        this.alertService.error('Failed to load skills');
        this.companySkillsForManage.set([]);
      }
    });
  }

  getSkillsByCategory(categoryId: string): any[] {
    return this.companySkillsForManage().filter(s => 
      s.categoryId && (
        (typeof s.categoryId === 'string' && s.categoryId === categoryId) ||
        (typeof s.categoryId === 'object' && s.categoryId?._id === categoryId)
      ) ||
      (s.category && s.category._id === categoryId)
    );
  }

  getOrphanSkills(): any[] {
    return this.companySkillsForManage().filter(s => !s.categoryId && !s.category);
  }

  getVisibleCategoriesCount(): number {
    // ONLY count company-created categories (not admin categories)
    let categories = [...this.ownCategories()];

    // Apply search filter if any
    if (this.skillSearchTerm()) {
      const searchLower = this.skillSearchTerm().toLowerCase();
      return categories.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        (c.description || '').toLowerCase().includes(searchLower)
      ).length;
    }

    return categories.length;
  }

  removeSkillFromCategory(skill: any): void {
    this.alertService.confirm(
      'Remove from category?',
      `"${skill.name}" will be removed from its category and become orphan.`,
      'Yes, make orphan',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        const updateData = { categoryId: null };
        
        this.skillService.updateSkill(skill._id, updateData as any).subscribe({
          next: () => {
            this.alertService.toast(
              `"${skill.name}" made orphan successfully`,
              'success'
            );
            this.loadCompanySkillsForManage();
          },
          error: (error) => {
            console.error('Error making skill orphan:', error);
            this.alertService.error('Failed to make skill orphan');
          }
        });
      }
    });
  }

  // Drag and Drop Methods
  onDragStart(event: DragEvent, skill: any): void {
    this.draggedSkill.set(skill);
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragEnd(event: DragEvent): void {
    // Clear all drag states when drag ends (whether dropped or not)
    this.dragOverCategoryId.set(null);
    this.dragOverOrphanZone.set(false);
    this.draggedSkill.set(null); // Clear dragged skill to hide orphan zone
  }

  onDragOver(event: DragEvent, categoryId: string): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverCategoryId.set(categoryId);
    this.dragOverOrphanZone.set(false); // Clear orphan zone highlight when over category
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverCategoryId.set(null);
  }

  onDragOverOrphanZone(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverOrphanZone.set(true);
    this.dragOverCategoryId.set(null); // Clear category highlight when over orphan zone
  }

  onDragLeaveOrphanZone(event: DragEvent): void {
    this.dragOverOrphanZone.set(false);
  }

  onDrop(event: DragEvent, targetCategory: any): void {
    event.preventDefault();
    event.stopPropagation();
    const skill = this.draggedSkill();
    if (!skill || !targetCategory) {
      this.alertService.error('Invalid drop operation');
      return;
    }

    // Check if skill is already in this category
    if (skill.categoryId === targetCategory._id || skill.category?._id === targetCategory._id) {
      this.alertService.warning('Skill is already in this category');
      this.draggedSkill.set(null);
      this.dragOverCategoryId.set(null);
      return;
    }

    // Update skill with new category
    const updateData = {
      categoryId: targetCategory._id
    };

    this.skillService.updateSkill(skill._id, updateData as any).subscribe({
      next: () => {
        this.alertService.toast(
          `Moved "${skill.name}" to "${targetCategory.name}"`,
          'success'
        );
        this.draggedSkill.set(null);
        this.dragOverCategoryId.set(null);
        this.loadCompanySkillsForManage();
      },
      error: (error) => {
        console.error('Error updating skill:', error);
        this.alertService.error('Failed to move skill to category');
        this.draggedSkill.set(null);
        this.dragOverCategoryId.set(null);
      }
    });
  }

  onDropOrphanZone(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const skill = this.draggedSkill();
    if (!skill) {
      this.alertService.error('Invalid drop operation');
      return;
    }

    // Check if already orphan
    if (!skill.categoryId && !skill.category) {
      this.alertService.warning('Skill is already orphan');
      this.draggedSkill.set(null);
      this.dragOverOrphanZone.set(false);
      return;
    }

    // Make skill orphan
    const updateData = { categoryId: null };
    this.skillService.updateSkill(skill._id, updateData as any).subscribe({
      next: () => {
        this.alertService.toast(
          `"${skill.name}" made orphan successfully`,
          'success'
        );
        this.draggedSkill.set(null);
        this.dragOverOrphanZone.set(false);
        this.loadCompanySkillsForManage();
      },
      error: (error) => {
        console.error('Error making skill orphan:', error);
        this.alertService.error('Failed to make skill orphan');
        this.draggedSkill.set(null);
        this.dragOverOrphanZone.set(false);
      }
    });
  }

}
