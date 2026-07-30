import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { AlertService } from '../../../core/services/alert.service';
import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';

interface CategorySkill {
  _id: string;
  skill_name: string;
  skill_desc?: string;
  skill_level: string;
  skill_score: number;
  user_id: {
    _id: string;
    fullName: string;
    email: string;
  };
  category?: {
    _id: string;
    name: string;
  };
}

@Component({
  selector: 'app-view-category-skills',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './view-category-skills.html',
  styleUrl: './view-category-skills.scss',
})
export class ViewCategorySkills implements OnInit {
  private readonly skillCategoryService = inject(SkillCategoryService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Data signals
  readonly category = signal<SkillCategory | null>(null);
  readonly assignedSkills = signal<CategorySkill[]>([]);
  readonly unassignedSkills = signal<CategorySkill[]>([]);
  readonly loading = signal(false);
  readonly assignedLoading = signal(false);
  readonly unassignedLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Pagination signals
  readonly assignedPage = signal(1);
  readonly assignedPageSize = signal(5);
  readonly assignedTotal = signal(0);

  readonly unassignedPage = signal(1);
  readonly unassignedPageSize = signal(5);
  readonly unassignedTotal = signal(0);

  // Selection signals
  readonly selectedAssigned = signal<string[]>([]);
  readonly selectedUnassigned = signal<string[]>([]);

  // Filter signals
  readonly searchForm = signal<FormGroup | null>(null);
  readonly skillLevelFilter = signal<string>('');

  // Action signals
  readonly isMoving = signal(false);

  // Computed values
  readonly assignedTotalPages = computed(() => {
    return Math.ceil(this.assignedTotal() / this.assignedPageSize());
  });

  readonly unassignedTotalPages = computed(() => {
    return Math.ceil(this.unassignedTotal() / this.unassignedPageSize());
  });

  readonly canMoveRight = computed(() => {
    return this.selectedUnassigned().length > 0;
  });

  readonly canMoveLeft = computed(() => {
    return this.selectedAssigned().length > 0;
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategoryAndSkills();
  }

  private initializeForm(): void {
    const form = this.fb.group({
      search: [''],
    });
    this.searchForm.set(form);
  }

  private loadCategoryAndSkills(): void {
    const categoryId = this.route.snapshot.paramMap.get('id');
    if (!categoryId) {
      this.error.set('Category not found');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.skillCategoryService.getById(categoryId).subscribe({
      next: (response) => {
        if (response?.data) {
          this.category.set(response.data);
          this.loadSkills(categoryId);
        }
      },
      error: (err) => {
        console.error('Error loading category:', err);
        this.error.set('Failed to load category');
        this.alertService.error('Failed to load category');
        this.loading.set(false);
      },
    });
  }

  private loadSkills(categoryId: string): void {
    this.assignedLoading.set(true);
    this.unassignedLoading.set(true);

    const params = {
      page: 1,
      limit: 100, // Load more to show all available
      search: this.searchForm()?.get('search')?.value || undefined,
      skill_level: this.skillLevelFilter() || undefined,
    };

    // Load assigned skills
    this.skillCategoryService.getSkillsByCategory(categoryId, params).subscribe({
      next: (response) => {
        if (response?.data) {
          if (Array.isArray(response.data)) {
            this.assignedSkills.set(response.data);
            this.assignedTotal.set(response.data.length);
          } else if (response.data.skills) {
            this.assignedSkills.set(response.data.skills);
            this.assignedTotal.set(response.data.pagination?.total || response.data.skills.length);
          }
        }
        this.assignedLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading assigned skills:', err);
        this.alertService.error('Failed to load assigned skills');
        this.assignedLoading.set(false);
      },
    });

    // Load unassigned skills
    this.skillCategoryService.getUnassignedSkills(categoryId, params).subscribe({
      next: (response) => {
        if (response?.data) {
          if (Array.isArray(response.data)) {
            this.unassignedSkills.set(response.data);
            this.unassignedTotal.set(response.data.length);
          } else if (response.data.skills) {
            this.unassignedSkills.set(response.data.skills);
            this.unassignedTotal.set(response.data.pagination?.total || response.data.skills.length);
          }
        }
        this.unassignedLoading.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading unassigned skills:', err);
        this.alertService.error('Failed to load unassigned skills');
        this.unassignedLoading.set(false);
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.assignedPage.set(1);
    this.unassignedPage.set(1);
    const categoryId = this.route.snapshot.paramMap.get('id');
    if (categoryId) {
      this.loadSkills(categoryId);
    }
  }

  onLevelFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.skillLevelFilter.set(value);
    this.assignedPage.set(1);
    this.unassignedPage.set(1);
    const categoryId = this.route.snapshot.paramMap.get('id');
    if (categoryId) {
      this.loadSkills(categoryId);
    }
  }

  // Assigned skills selection
  toggleAssignedSelection(skillId: string): void {
    const selected = this.selectedAssigned();
    if (selected.includes(skillId)) {
      this.selectedAssigned.set(selected.filter(id => id !== skillId));
    } else {
      this.selectedAssigned.set([...selected, skillId]);
    }
  }

  isAssignedSelected(skillId: string): boolean {
    return this.selectedAssigned().includes(skillId);
  }

  selectAllAssigned(): void {
    const allIds = this.assignedSkills().map(skill => skill._id);
    this.selectedAssigned.set(allIds);
  }

  deselectAllAssigned(): void {
    this.selectedAssigned.set([]);
  }

  // Unassigned skills selection
  toggleUnassignedSelection(skillId: string): void {
    const selected = this.selectedUnassigned();
    if (selected.includes(skillId)) {
      this.selectedUnassigned.set(selected.filter(id => id !== skillId));
    } else {
      this.selectedUnassigned.set([...selected, skillId]);
    }
  }

  isUnassignedSelected(skillId: string): boolean {
    return this.selectedUnassigned().includes(skillId);
  }

  selectAllUnassigned(): void {
    const allIds = this.unassignedSkills().map(skill => skill._id);
    this.selectedUnassigned.set(allIds);
  }

  deselectAllUnassigned(): void {
    this.selectedUnassigned.set([]);
  }

  // Move operations
  moveToRight(): void {
    if (!this.canMoveRight()) {
      this.alertService.warning('Please select skills to assign.');
      return;
    }

    const categoryId = this.route.snapshot.paramMap.get('id');
    if (!categoryId) return;

    this.isMoving.set(true);
    this.skillCategoryService.assignSkills(this.selectedUnassigned(), categoryId).subscribe({
      next: () => {
        this.alertService.success(`${this.selectedUnassigned().length} skill(s) assigned successfully`);
        this.selectedUnassigned.set([]);
        this.isMoving.set(false);
        this.loadSkills(categoryId);
      },
      error: (err) => {
        console.error('Error assigning skills:', err);
        this.alertService.error('Failed to assign skills');
        this.isMoving.set(false);
      },
    });
  }

  moveToLeft(): void {
    if (!this.canMoveLeft()) {
      this.alertService.warning('Please select skills to remove.');
      return;
    }

    const categoryId = this.route.snapshot.paramMap.get('id');
    if (!categoryId) return;

    this.alertService.confirm(
      'Remove selected skills from this category?',
      `${this.selectedAssigned().length} skill(s) will be removed from "${this.category()?.name}".`,
      'Yes, remove',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.isMoving.set(true);
        this.skillCategoryService.removeSkills(this.selectedAssigned()).subscribe({
          next: () => {
            this.alertService.success(`${this.selectedAssigned().length} skill(s) removed successfully`);
            this.selectedAssigned.set([]);
            this.isMoving.set(false);
            this.loadSkills(categoryId);
          },
          error: (err) => {
            console.error('Error removing skills:', err);
            this.alertService.error('Failed to remove skills');
            this.isMoving.set(false);
          },
        });
      }
    });
  }

  backToCategories(): void {
    this.router.navigate(['/admin/skill-categories']);
  }

  getSkillLevelBadgeClass(level: string): string {
    const levelLower = level?.toLowerCase() || '';
    if (levelLower === 'expert') return 'bg-success';
    if (levelLower === 'advanced') return 'bg-info';
    if (levelLower === 'intermediate') return 'bg-warning';
    return 'bg-secondary';
  }

  getScoreBadgeClass(score: number): string {
    if (score >= 85) return 'bg-success';
    if (score >= 65) return 'bg-warning';
    return 'bg-danger';
  }

  onAssignedPageChange(page: number): void {
    if (page >= 1 && page <= this.assignedTotalPages()) {
      this.assignedPage.set(page);
    }
  }

  onUnassignedPageChange(page: number): void {
    if (page >= 1 && page <= this.unassignedTotalPages()) {
      this.unassignedPage.set(page);
    }
  }

  getDisplayedAssigned(): CategorySkill[] {
    const start = (this.assignedPage() - 1) * this.assignedPageSize();
    return this.assignedSkills().slice(start, start + this.assignedPageSize());
  }

  getDisplayedUnassigned(): CategorySkill[] {
    const start = (this.unassignedPage() - 1) * this.unassignedPageSize();
    return this.unassignedSkills().slice(start, start + this.unassignedPageSize());
  }

  onSearchInputChange(event: any): void {
    const value = event.target.value;
    this.searchForm()?.get('search')?.setValue(value);
  }

  onToggleAllUnassigned(event: any): void {
    if (event.target.checked) {
      this.selectAllUnassigned();
    } else {
      this.deselectAllUnassigned();
    }
  }

  onToggleAllAssigned(event: any): void {
    if (event.target.checked) {
      this.selectAllAssigned();
    } else {
      this.deselectAllAssigned();
    }
  }
}
