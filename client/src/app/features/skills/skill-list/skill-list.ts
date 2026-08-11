import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { SkillService } from '../../../core/services/skill.service';
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssessmentService } from '../../../core/services/assessment.service';

import { Skill } from '../../../shared/interfaces/skill.interface';
import { SkillCategory } from '../../../shared/interfaces/skill-category.interface';
import { AssessmentReport, MyAssessmentItem } from '../../../shared/interfaces/assessment.interface';

import { TableActions } from '../../../shared/components/table-actions/table-actions';

Chart.register(...registerables);

type ReportSection = Record<string, any>;

@Component({
  selector: 'app-skill-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableActions,
    FormsModule
  ],
  templateUrl: './skill-list.html',
  styleUrl: './skill-list.scss'
})
export class SkillList implements OnInit, AfterViewInit, OnDestroy {

  private readonly service = inject(SkillService);
  private readonly categoryService = inject(SkillCategoryService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly auth = inject(AuthService);

  // Data signals
  currentSkills = signal<Skill[]>([]);
  employeeId = signal<string | null>(null);
  isViewingEmployeeSkills = signal<boolean>(false);

  // Bulk selection signals
  selectedSkillIds = signal<Set<string>>(new Set());
  selectAll = signal<boolean>(false);

  // Pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalSkills = signal<number>(0);

  // Filter signals
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('');
  statusFilter = signal<string>('');
  categoryList = signal<SkillCategory[]>([]);
  categories = signal<string[]>([]);

  // Modal control signal
  selectedSkillForView = signal<Skill | null>(null);
  showSkillModal = signal<boolean>(false);

  // Loading signal
  isLoading = signal<boolean>(false);

  // PRISM Assessment signals
  readonly myAssessments = this.assessmentService.myAssessments;
  readonly assessmentLoading = this.assessmentService.assessmentLoading;
  readonly assessmentError = this.assessmentService.assessmentError;
  readonly prismReport = signal<AssessmentReport | null>(null);
  readonly prismReportLoading = signal<boolean>(false);
  readonly prismReportError = signal<string | null>(null);

  @ViewChild('behaviourChart') behaviourChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('aptitudeChart') aptitudeChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('eiChart') eiChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fourDChart') fourDChart?: ElementRef<HTMLCanvasElement>;

  private prismCharts: Array<{ destroy: () => void }> = [];

  // Computed values
  totalPages = computed(() => Math.ceil(this.totalSkills() / this.pageSize()));

  // Computed: Check if all paginated skills are selected
  areAllPaginatedSelected = computed(() => {
    const paginated = this.currentSkills();
    if (paginated.length === 0) return false;
    return paginated.every(skill => this.selectedSkillIds().has(skill._id));
  });

  // Computed: Count of selected skills
  selectedCount = computed(() => this.selectedSkillIds().size);

  // Computed: Get category name by ID
  getCategoryNameById = computed(() => {
    const cats = this.categoryList();
    return (id: string) => {
      const cat = cats.find((c: any) => c._id === id || c.id === id);
      return cat?.name || id || 'Unknown';
    };
  });

  // Expose Math to template
  Math = Math;

  ngOnInit(): void {
    // Check if we're viewing a specific employee's skills
    const userId = this.route.snapshot.params['id'];
    if (userId) {
      this.employeeId.set(userId);
      this.isViewingEmployeeSkills.set(true);
    }

    this.loadCategories();
    this.loadSkills();

    if (this.canShowPrismAssessments()) {
      this.loadMyAssessments();
    }
  }

  ngAfterViewInit(): void {
    if (this.prismReport()) {
      this.renderPrismCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyPrismCharts();
  }

  canShowPrismAssessments(): boolean {
    return this.auth.role() === 'employee' && !this.isViewingEmployeeSkills();
  }

  hasCompletedPrismAssessment(assessments: MyAssessmentItem[] = this.myAssessments()): boolean {
    return assessments.some((assessment) => !assessment.error && assessment.isCompleted && assessment.isPaidFor);
  }

  loadCategories(): void {
    // Load all categories available in the system
    this.categoryService.getAll({ limit: 100 }).subscribe({
      next: (response) => {
        // Response can be either an array or { categories, pagination }
        const result = response?.data as any;
        let categories: SkillCategory[] = [];

        if (Array.isArray(result)) {
          categories = result;
        } else if (result?.categories && Array.isArray(result.categories)) {
          categories = result.categories;
        } else if (result?.categories) {
          categories = [result.categories];
        }

        this.categoryList.set(categories);
        
        // Extract category IDs for the categories signal
        const categoryIds = categories
          .map((cat: any) => cat._id || cat.id)
          .filter(Boolean);
        this.categories.set(categoryIds);
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.categoryList.set([]);
        this.categories.set([]);
      }
    });
  }

  loadSkills(): void {
    this.isLoading.set(true);
    const employeeId = this.employeeId();
    const role = this.auth.role();
    
    // If employee accessing their own skills, fetch their skills
    if (role === 'employee' && !employeeId) {
      // Get current user's ID from auth service
      const currentUserId = this.auth.user()?._id;
      if (currentUserId) {
        this.loadEmployeeSkills(currentUserId);
      } else {
        this.alertService.error('Unable to load your skills');
        this.isLoading.set(false);
      }
    }
    // If viewing a specific employee's skills
    else if (this.isViewingEmployeeSkills() && employeeId) {
      this.loadEmployeeSkills(employeeId);
    } 
    // Otherwise load company/admin skills
    else {
      this.loadCompanySkills();
    }
  }

  private loadEmployeeSkills(employeeId: string): void {
    // Use userService to get employee skills from SkillUser table
    this.userService.getEmployeeSkills(employeeId).subscribe({
      next: (response: any) => {
        const skills = response.data || [];
        
        // Transform skill user data to match Skill interface
        let transformedSkills = skills
          .map((su: any) => {
            const skillObj = su.skillId || {};
            return {
              _id: skillObj._id || su.skillId,
              name: skillObj.name || 'Unknown Skill',
              description: skillObj.description || skillObj.skill_desc || '',
              categoryId: skillObj.categoryId || skillObj.cat_id,
              createdBy: skillObj.createdBy,
              createdType: skillObj.createdType,
              companyId: skillObj.companyId,
              archived: skillObj.archived || false,
              status: skillObj.status || 'active',
              createdAt: skillObj.createdAt,
              updatedAt: skillObj.updatedAt,
              // Employee-specific fields
              score: su.score || 0,
              level: su.level || 'beginner',
            };
          })
          // Filter out archived skills
          .filter((skill: any) => !skill.archived);
        
        console.log('Transformed skills:', transformedSkills);
        
        // Apply search filter
        if (this.searchTerm()) {
          const searchLower = this.searchTerm().toLowerCase();
          transformedSkills = transformedSkills.filter((skill: any) =>
            skill.name.toLowerCase().includes(searchLower) ||
            (skill.description && skill.description.toLowerCase().includes(searchLower))
          );
        }
        
        this.currentSkills.set(transformedSkills);
        this.totalSkills.set(transformedSkills.length);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load employee skills:', err);
        this.alertService.error('Failed to load employee skills');
        this.isLoading.set(false);
      }
    });
  }

  private loadCompanySkills(): void {
    // Build query parameters with pagination and filters
    const query: any = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.searchTerm()) {
      query.search = this.searchTerm();
    }

    if (this.selectedCategory()) {
      query.categoryId = this.selectedCategory();
    }

    if (this.statusFilter()) {
      query.status = this.statusFilter();
    }

    this.service.getSkills(query).subscribe({
      next: (response) => {
        const result = response?.data as any || {};
        
        // Handle both response formats:
        // Backend returns { skills, total, page, limit }
        // OR { skills, pagination: { total, page, limit } }
        const skills = result.skills || [];
        let total = result.total;
        if (total === undefined && result.pagination) {
          total = result.pagination.total;
        }
        total = total || 0;
        
        this.currentSkills.set(skills);
        this.totalSkills.set(total);

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.alertService.error('Failed to load skills');
        this.isLoading.set(false);
      }
    });
  }

  getPageTitle(): string {
    if (this.isViewingEmployeeSkills()) {
      return 'Employee Skills';
    }
    const role = this.auth.role();
    if (role === 'employee') {
      return 'My Skills';
    }
    return 'All Skills';
  }

  getPageSubtitle(): string {
    if (this.isViewingEmployeeSkills()) {
      return 'View employee skills (read-only)';
    }
    const role = this.auth.role();
    if (role === 'employee') {
      return 'Manage your personal skills';
    }
    return 'Manage all skills in the platform';
  }

  getCreateRoute(): string {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';
    if (role === 'employee') {
      return `/${rolePrefix}/my-skills/create`;
    }
    return `/${rolePrefix}/skills/create`;
  }

  canModifySkills(): boolean {
    const role = this.auth.role();

    if (role === 'employee') {
      return false;
    }

    if (this.isViewingEmployeeSkills()) {
      return false;
    }

    return role === 'admin' || role === 'company';
  }

  getBackRoute(): string {
    const role = this.auth.role();
    const rolePrefix = role || 'admin';
    return `/${rolePrefix}/users`;
  }

  getCategoryName(skill: Skill): string {
    if (typeof skill.categoryId === 'string') {
      return skill.categoryId;
    }
    return (skill.categoryId as any)?.name || 'Unknown';
  }

  getSkillLevel(skill: any): string {
    return (skill && skill.level) ? skill.level : 'beginner';
  }

  getSkillScore(skill: any): number {
    return (skill && skill.score) ? skill.score : 0;
  }

  getSkillLevelBadgeClass(skill: any): string {
    const level = (skill && skill.level) ? skill.level.toLowerCase() : 'beginner';
    if (level === 'expert') return 'bg-success';
    if (level === 'advanced') return 'bg-info';
    if (level === 'intermediate') return 'bg-warning';
    return 'bg-secondary';
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.loadSkills();
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.currentPage.set(1);
    this.loadSkills();
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadSkills();
  }

  onPageChange(page: number): void {
    const total = this.totalPages();
    if (page >= 1 && page <= Math.max(1, total)) {
      this.currentPage.set(page);
      this.loadSkills();
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadSkills();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.statusFilter.set('');
    this.currentPage.set(1);
    this.loadSkills();
  }

  toggleSkillStatus(skill: Skill): void {
    const newStatus = skill.status === 'active' ? 'inactive' : 'active';
    const statusText = newStatus === 'active' ? 'activate' : 'deactivate';

    this.alertService.confirm(
      `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} "${skill.name}"?`,
      `Are you sure you want to ${statusText} this skill?`
    ).then((confirmed) => {
      if (confirmed) {
        this.service.bulkUpdateStatus([skill._id], newStatus).subscribe({
          next: () => {
            this.loadSkills();
            this.alertService.toast(`Skill ${statusText}d successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error(`Failed to ${statusText} skill. Please try again.`);
          }
        });
      }
    });
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();
    const maxVisible = 5;
    const result: number[] = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        result.push(i);
      }
    } else {
      result.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        result.push(-1);
      }

      for (let i = start; i <= end; i++) {
        result.push(i);
      }

      if (end < totalPages - 1) {
        result.push(-1);
      }

      result.push(totalPages);
    }

    return result;
  }

  getSkillName(skill: any): string {
    return skill?.name || skill?.skill_name || 'Unknown Skill';
  }

  editSkill(skill: Skill): void {
    const role = this.auth.role();

    console.log('editSkill called with:', skill, 'name:', skill.name);

    // Employees can only view (read-only modal)
    if (role === 'employee') {
      this.selectedSkillForView.set(skill);
      this.showSkillModal.set(true);
      console.log('Modal opened with skill:', this.selectedSkillForView());
    } else {
      // Admin/Company can edit
      const rolePrefix = role || 'admin';
      this.router.navigate([`/${rolePrefix}/skills`, skill._id, 'edit']);
    }
  }

  closeSkillModal(): void {
    this.showSkillModal.set(false);
    this.selectedSkillForView.set(null);
  }

  onCardHover(event: any, isEnter: boolean): void {
    const card = event.currentTarget as HTMLElement;
    if (isEnter) {
      card.style.transform = 'translateY(-8px)';
      card.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)';
    } else {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '';
    }
  }

  deleteSkill(skill: Skill): void {
    this.alertService.confirmDelete(skill.name).then((confirmed) => {
      if (confirmed) {
        this.service.deleteSkill(skill._id).subscribe({
          next: () => {
            this.loadSkills();
            this.alertService.toast('Skill deleted successfully', 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to delete skill. Please try again.');
          }
        });
      }
    });
  }

  // Bulk selection methods
  toggleSkillSelection(skillId: string): void {
    const selected = new Set(this.selectedSkillIds());
    if (selected.has(skillId)) {
      selected.delete(skillId);
    } else {
      selected.add(skillId);
    }
    this.selectedSkillIds.set(selected);
    console.log('Selected skills:', Array.from(selected), 'Count:', selected.size);
  }

  toggleSelectAll(): void {
    const paginated = this.currentSkills();
    if (this.areAllPaginatedSelected()) {
      // Deselect all on current page
      const selected = new Set(this.selectedSkillIds());
      paginated.forEach(skill => selected.delete(skill._id));
      this.selectedSkillIds.set(selected);
      this.selectAll.set(false);
    } else {
      // Select all on current page
      const selected = new Set(this.selectedSkillIds());
      paginated.forEach(skill => selected.add(skill._id));
      this.selectedSkillIds.set(selected);
      this.selectAll.set(true);
    }
  }

  isSkillSelected(skillId: string): boolean {
    return this.selectedSkillIds().has(skillId);
  }

  clearSelection(): void {
    this.selectedSkillIds.set(new Set());
    this.selectAll.set(false);
  }

  getSelectedSkillIds(): string[] {
    return Array.from(this.selectedSkillIds());
  }

  onBulkDelete(): void {
    const count = this.selectedCount();
    this.alertService.confirm(
      `Delete ${count} skill(s)?`,
      `Are you sure you want to permanently delete ${count} selected skill(s)? This action cannot be undone.`
    ).then((confirmed) => {
      if (confirmed) {
        const skillIds = this.getSelectedSkillIds();
        this.service.bulkDeleteSkills(skillIds).subscribe({
          next: () => {
            this.clearSelection();
            this.loadSkills();
            this.alertService.toast(`${count} skill(s) deleted successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to delete skills. Please try again.');
          }
        });
      }
    });
  }

  onBulkMoveToCategory(): void {
    const count = this.selectedCount();
    const availableCategories = this.categoryList();
    
    if (availableCategories.length === 0) {
      this.alertService.warning('No categories available. Please create at least one category first.');
      return;
    }

    // Map categories to { id, name } format for the alert service
    const categoryOptions = availableCategories.map((cat: any) => ({
      id: cat._id,
      name: cat.name
    }));

    this.alertService.selectCategory(categoryOptions).then((targetCategoryId: string | null) => {
      if (targetCategoryId) {
        const skillIds = this.getSelectedSkillIds();
        this.service.bulkMoveSkills(skillIds, targetCategoryId).subscribe({
          next: () => {
            this.clearSelection();
            this.loadSkills();
            this.alertService.toast(`${count} skill(s) moved successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to move skills. Please try again.');
          }
        });
      }
    });
  }

  onBulkArchive(): void {
    const count = this.selectedCount();
    this.alertService.confirm(
      `Archive ${count} skill(s)?`,
      `Are you sure you want to archive ${count} selected skill(s)? You can restore them later.`
    ).then((confirmed) => {
      if (confirmed) {
        const skillIds = this.getSelectedSkillIds();
        this.service.bulkArchiveSkills(skillIds).subscribe({
          next: () => {
            this.clearSelection();
            this.loadSkills();
            this.alertService.toast(`${count} skill(s) archived successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to archive skills. Please try again.');
          }
        });
      }
    });
  }

  onBulkSetActive(): void {
    const count = this.selectedCount();
    this.alertService.confirm(
      `Mark ${count} skill(s) as Active?`,
      `Are you sure you want to mark ${count} selected skill(s) as active?`
    ).then((confirmed) => {
      if (confirmed) {
        const skillIds = this.getSelectedSkillIds();
        this.service.bulkUpdateStatus(skillIds, 'active').subscribe({
          next: () => {
            this.clearSelection();
            this.loadSkills();
            this.alertService.toast(`${count} skill(s) marked as active successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to update skill status. Please try again.');
          }
        });
      }
    });
  }

  onBulkSetInactive(): void {
    const count = this.selectedCount();
    this.alertService.confirm(
      `Mark ${count} skill(s) as Inactive?`,
      `Are you sure you want to mark ${count} selected skill(s) as inactive?`
    ).then((confirmed) => {
      if (confirmed) {
        const skillIds = this.getSelectedSkillIds();
        this.service.bulkUpdateStatus(skillIds, 'inactive').subscribe({
          next: () => {
            this.clearSelection();
            this.loadSkills();
            this.alertService.toast(`${count} skill(s) marked as inactive successfully`, 'success');
          },
          error: (err) => {
            console.error(err);
            this.alertService.error('Failed to update skill status. Please try again.');
          }
        });
      }
    });
  }

  private loadMyAssessments(): void {
    this.assessmentService.fetchMyAssessments().pipe(take(1)).subscribe({
      next: (response) => {
        const assessments = response.data?.assessments || [];

        if (this.hasCompletedPrismAssessment(assessments)) {
          this.loadMyPrismReport();
        } else {
          this.prismReport.set(null);
          this.prismReportError.set(null);
          this.destroyPrismCharts();
        }
      },
      error: (err) => console.error('Error loading PRISM assessments:', err),
    });
  }

  takeAssessment(url: string): void {
    if (url) window.open(url, '_blank');
  }

  private loadMyPrismReport(): void {
    const employee = this.auth.user();
    if (!employee?._id) return;

    this.prismReportLoading.set(true);
    this.prismReportError.set(null);

    this.assessmentService.getAssessmentReport(employee._id).pipe(take(1)).subscribe({
      next: (response) => {
        this.prismReport.set(response.data);
        this.prismReportLoading.set(false);
        setTimeout(() => this.renderPrismCharts(), 0);
      },
      error: (err) => {
        this.prismReport.set(null);
        this.prismReportLoading.set(false);
        this.prismReportError.set(err.error?.message || 'Unable to load your PRISM report.');
        this.destroyPrismCharts();
      },
    });
  }

  getAssessmentActionLabel(assessment: any): string {
    if (assessment.error) return 'Error';
    if (!assessment.isCompleted) return 'Take Assessment';
    if (assessment.isCompleted && !assessment.isPaidFor) return 'Complete Payment';
    return 'Report available';
  }

  getAssessmentStatusBadgeClass(questStatus: number): string {
    if (questStatus === 1 || questStatus === 2) return 'badge-blue';
    if (questStatus === 3 || questStatus === 4) return 'badge-yellow';
    if (questStatus === 6) return 'badge-green';
    return 'badge-gray';
  }

  get prismAssessmentData(): ReportSection {
    return (this.prismReport()?.reportData as any)?.assessmentData || {};
  }

  get prismEmotionalIntelligenceData(): ReportSection {
    return (this.prismReport()?.reportData as any)?.emotionalIntelligenceData || {};
  }

  get fourDText(): string {
    return String(this.prismAssessmentData['fourDText'] || '').trim();
  }

  get fourDData(): Array<{ name: string; score: number }> {
    const output = (this.prismReport()?.reportData as any)?.fourDRawOutput?.Output4D || [];
    return output.map((item: any) => ({ name: item.Name || `Quadrant ${item.QuadID}`, score: Number(item.Value) || 0 }));
  }

  get behaviourItems(): Array<{ name: string; score: number }> {
    return (this.prismAssessmentData['dtBehData'] || []).map((item: any) => ({
      name: String(item.value || '').split('|')[0] || 'Behaviour',
      score: Number(item.key) || 0,
    }));
  }

  get aptitudeItems(): Array<{ name: string; score: number }> {
    return (this.prismAssessmentData['dtWAData'] || []).map((item: any) => ({
      name: item.apt_title || 'Work aptitude',
      score: Number(item.score) || 0,
    }));
  }

  get eiItems(): Array<{ name: string; score: number }> {
    return [
      ...(this.prismEmotionalIntelligenceData['CDAItems'] || []),
      ...(this.prismEmotionalIntelligenceData['EQItems'] || []),
      ...(this.prismEmotionalIntelligenceData['MTItems'] || []),
    ]
      .filter((item: any) => item.item_title || item.itemTitle)
      .map((item: any) => ({ name: item.item_title || item.itemTitle, score: Number(item.item_score ?? item.score) || 0 }));
  }

  get topBehaviours(): Array<{ name: string; description: string }> {
    return (this.prismAssessmentData['dtTopBehData'] || []).slice(0, 4).map((item: any) => ({
      name: item.value || 'Behaviour',
      description: this.cleanHtml(item.key || ''),
    }));
  }

  private cleanHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '').replace(/&#8217;/g, "'");
  }

  private destroyPrismCharts(): void {
    this.prismCharts.forEach((chart) => chart.destroy());
    this.prismCharts = [];
  }

  private renderPrismCharts(): void {
    if (typeof window === 'undefined') return;

    this.destroyPrismCharts();
    this.createPrismChart(this.behaviourChart, this.behaviourItems, 'PRISM profile value', '#5669d9');
    this.createPrismChart(this.aptitudeChart, this.aptitudeItems, 'PRISM profile value', '#e69a3a');
    this.createPrismChart(this.eiChart, this.eiItems.slice(0, 12), 'PRISM profile value', '#35a77a');
    this.createPrismChart(this.fourDChart, this.fourDData, 'PRISM profile value', '#7c3aed');
  }

  private createPrismChart(
    target: ElementRef<HTMLCanvasElement> | undefined,
    items: Array<{ name: string; score: number }>,
    label: string,
    color: string
  ): void {
    if (!target || !items.length) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: items.map((item) => item.name),
        datasets: [{ label, data: items.map((item) => item.score), backgroundColor: color, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, ticks: { display: false }, grid: { display: false } },
          y: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    };

    this.prismCharts.push(new Chart(target.nativeElement, config));
  }
}
