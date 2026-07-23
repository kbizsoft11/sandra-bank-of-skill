import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { UserService } from '../../core/services/user.service';
import { AlertService } from '../../core/services/alert.service';

interface CompanySkill {
  skill_name: string;
  category: {
    _id: string;
    cat_name: string;
  };
  employeeCount: number;
  averageScore: number;
  representativeSkillId?: string;
  employees: Array<{
    _id: string;
    fullName: string;
    email: string;
    department?: string;
    location?: string;
    skill_level: string;
    skill_score: number;
  }>;
}

function getDecimal(value: number): number {
  return Number(value.toFixed(1));
}

interface SkillEmployee {
  _id: string;
  skillId?: string;
  createdAt?: string;
  fullName: string;
  email: string;
  department?: string;
  location?: string;
  title?: string;
  profileImage?: string;
  skill_level: string;
  skill_score: number;
  category: {
    _id: string;
    cat_name: string;
  };
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
export class CompanySkills implements OnInit {

  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);

  // Expose Math for template
  Math = Math;

  // State
  skills = signal<CompanySkill[]>([]);
  filteredSkills = signal<CompanySkill[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  sortColumn = signal<string>('employeeCount');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modal state
  showEmployeesModal = signal<boolean>(false);
  selectedSkill = signal<CompanySkill | null>(null);
  skillEmployees = signal<SkillEmployee[]>([]);
  isLoadingEmployees = signal<boolean>(false);

  // Computed
  readonly paginatedSkills = computed(() => {
    const filtered = this.filteredSkills();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredSkills().length / this.pageSize());
  });

  readonly totalSkills = computed(() => {
    return this.skills().length;
  });

  readonly totalSkillAssignments = computed(() => {
    return this.skills().reduce((sum, skill) => sum + skill.employeeCount, 0);
  });

  readonly averageSkillScore = computed(() => {
    const skills = this.skills();
    const totalAssignments = skills.reduce((sum, skill) => sum + skill.employeeCount, 0);
    if (!totalAssignments) return 0;
    const weightedScore = skills.reduce((sum, skill) => sum + (skill.averageScore * skill.employeeCount), 0);
    return getDecimal(weightedScore / totalAssignments);
  });

  readonly topCategory = computed(() => {
    const counts: Record<string, number> = {};
    this.skills().forEach((skill) => {
      counts[skill.category.cat_name] = (counts[skill.category.cat_name] || 0) + skill.employeeCount;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : 'N/A';
  });

  readonly hasSkills = computed(() => {
    return this.skills().length > 0;
  });

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.isLoading.set(true);

    this.userService.getCompanySkills().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        if (response.success && response.data) {
          this.skills.set(response.data);
          this.applyFiltersAndSort();
        } else {
          this.skills.set([]);
          this.filteredSkills.set([]);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading skills:', error);
        this.alertService.error('Failed to load company skills. Please try again.');
      },
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1); // Reset to first page
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort(): void {
    let filtered = [...this.skills()];

    // Apply search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(skill =>
        skill.skill_name.toLowerCase().includes(search) ||
        skill.category.cat_name.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    const column = this.sortColumn();
    const direction = this.sortDirection();

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

        if (column === 'skill_name') {
        aVal = a.skill_name.toLowerCase();
        bVal = b.skill_name.toLowerCase();
      } else if (column === 'category') {
        aVal = a.category.cat_name.toLowerCase();
        bVal = b.category.cat_name.toLowerCase();
      } else if (column === 'employeeCount') {
        aVal = a.employeeCount;
        bVal = b.employeeCount;
      } else if (column === 'averageScore') {
        aVal = a.averageScore;
        bVal = b.averageScore;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredSkills.set(filtered);
  }

  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      // Toggle direction
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for numeric metrics and ascending for text
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'skill_name' || column === 'category' ? 'asc' : 'desc');
    }
    this.applyFiltersAndSort();
  }

  getSkillId(skill: CompanySkill): string {
    return skill.representativeSkillId || skill.category._id || '';
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
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  viewEmployees(skill: CompanySkill): void {
    this.selectedSkill.set(skill);
    this.isLoadingEmployees.set(true);
    this.showEmployeesModal.set(true);

    this.userService.getEmployeesBySkill(skill.skill_name).subscribe({
      next: (response) => {
        this.isLoadingEmployees.set(false);
        
        if (response.success && response.data) {
          this.skillEmployees.set(response.data);
        } else {
          this.skillEmployees.set([]);
        }
      },
      error: (error) => {
        this.isLoadingEmployees.set(false);
        console.error('Error loading employees:', error);
        this.alertService.error('Failed to load employees for this skill.');
      },
    });
  }

  editEmployeeSkill(skillId?: string): void {
    if (!skillId) {
      return;
    }
    this.router.navigate([`/company/company-skills/${skillId}/edit`]);
  }

  getVerificationStatus(score: number): string {
    if (score >= 85) {
      return 'Verified';
    }
    if (score >= 65) {
      return 'Pending review';
    }
    return 'Needs improvement';
  }

  getVerificationBadgeClass(score: number): string {
    if (score >= 85) return 'bg-success text-white';
    if (score >= 65) return 'bg-warning text-dark';
    return 'bg-danger text-white';
  }

  closeModal(): void {
    this.showEmployeesModal.set(false);
    this.selectedSkill.set(null);
    this.skillEmployees.set([]);
  }

  getSkillLevelClass(level: string): string {
    const levelLower = level.toLowerCase();
    if (levelLower === 'expert') return 'bg-success';
    if (levelLower === 'advanced') return 'bg-info';
    if (levelLower === 'intermediate') return 'bg-warning';
    return 'bg-secondary';
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

}
