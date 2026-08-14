import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import {
  CompanyAbout,
  CompanyAssessments,
  CompanyStats,
  DashboardService,
} from '../../core/services/dashboard.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { AlertService } from '../../core/services/alert.service';
import {
  OrganisationAssessments,
  EmployeeAssessment,
  QUEST_STATUS_CONFIG,
  PrismQuestStatus,
} from '../../shared/interfaces/assessment.interface';

Chart.register(...registerables);

type CompanyDashboardTab = 'summary' | 'skills' | 'trends' | 'assessments' | 'about';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './company-dashboard.html',
  styleUrl: './company-dashboard.scss',
})
export class CompanyDashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  readonly prismQuestionnaireTypes = [
    { id: 1, label: 'Professional' },
    { id: 21, label: 'Personal' },
    { id: 4, label: 'Foundation' },
    { id: 9, label: '4D' },
  ];
  readonly selectedQuestionnaireTypes = signal<Record<string, number>>({});

  private readonly tabStorageKey = 'companyDashboardActiveTab';
  private readonly validTabs: CompanyDashboardTab[] = ['summary', 'skills', 'trends', 'assessments', 'about'];

  @ViewChild('employeeStatusChart') employeeStatusChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topSkillsChart') topSkillsChart?: ElementRef<HTMLCanvasElement>;

  private employeeStatusChartInstance: Chart | null = null;
  private topSkillsChartInstance: Chart | null = null;

  readonly stats = signal<CompanyStats | null>(null);
  readonly about = signal<CompanyAbout | null>(null);
  readonly assessments = signal<CompanyAssessments | null>(null);
  readonly prismAssessments = signal<OrganisationAssessments | null>(null);
  readonly activeTab = signal<CompanyDashboardTab>('summary');
  readonly loading = signal(true);
  readonly tabLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly assessmentsPage = signal(1);
  readonly assessmentsPerPage = signal(10);
  readonly questStatusConfig = QUEST_STATUS_CONFIG;


  get companyName(): string {
    return this.authService.user()?.fullName || 'Company dashboard';
  }

  ngOnInit(): void {
    const storedTab = typeof window !== 'undefined'
      ? window.localStorage.getItem(this.tabStorageKey)
      : null;

    if (storedTab && this.validTabs.includes(storedTab as CompanyDashboardTab)) {
      this.activeTab.set(storedTab as CompanyDashboardTab);
    }

    if (this.activeTab() === 'assessments') {
      this.loadAssessments();
      this.loadPrismAssessments();
    }

    if (this.activeTab() === 'about') {
      this.loadAbout();
    }

    this.dashboardService.getCompanyStats().pipe(take(1)).subscribe({
      next: response => {
        this.stats.set(response.data);
        this.loading.set(false);
        if (this.activeTab() === 'summary') {
          setTimeout(() => this.renderCharts(), 0);
        }
      },
      error: error => {
        console.error('Error loading company dashboard:', error);
        this.error.set('Unable to load company dashboard data.');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  selectTab(tab: CompanyDashboardTab): void {
    if (!this.validTabs.includes(tab)) return;

    this.activeTab.set(tab);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.tabStorageKey, tab);
    }

    if (tab === 'about' && !this.about()) {
      this.loadAbout();
    }

    if (tab === 'assessments') {
      if (!this.assessments()) {
        this.loadAssessments();
      }
      if (!this.prismAssessments()) {
        this.loadPrismAssessments();
      }
    }

    if (tab === 'summary') {
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  private loadAbout(): void {
    this.tabLoading.set(true);
    this.dashboardService.getCompanyAbout().pipe(take(1)).subscribe({
      next: response => {
        this.about.set(response.data);
        this.tabLoading.set(false);
      },
      error: error => {
        console.error('Error loading company profile:', error);
        this.tabLoading.set(false);
      },
    });
  }

  loadAssessments(page = this.assessmentsPage(), limit = this.assessmentsPerPage()): void {
    this.tabLoading.set(true);
    this.dashboardService.getCompanyAssessments(page, limit).pipe(take(1)).subscribe({
      next: response => {
        this.assessments.set(response.data);
        this.assessmentsPage.set(response.data.pagination.page);
        this.assessmentsPerPage.set(response.data.pagination.limit);
        this.tabLoading.set(false);
      },
      error: error => {
        console.error('Error loading company assessments:', error);
        this.tabLoading.set(false);
      },
    });
  }

  onAssessmentsPerPageChange(event: Event): void {
    const limit = Number((event.target as HTMLSelectElement).value) || 10;
    this.assessmentsPage.set(1);
    this.loadAssessments(1, limit);
  }

  goToAssessmentsPage(page: number): void {
    const totalPages = this.assessments()?.pagination.totalPages || 1;
    if (page >= 1 && page <= totalPages) {
      this.loadAssessments(page, this.assessmentsPerPage());
    }
  }


  get initials(): string {
    return this.getInitials(this.companyName);
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'CO';
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  private destroyCharts(): void {
    this.employeeStatusChartInstance?.destroy();
    this.topSkillsChartInstance?.destroy();
    this.employeeStatusChartInstance = null;
    this.topSkillsChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined') return;
    if (!this.stats()) return;

    this.renderEmployeeStatusChart();
    this.renderTopSkillsChart();
  }

  private renderEmployeeStatusChart(): void {
    const canvas = this.employeeStatusChart?.nativeElement;
    if (!canvas) return;

    this.employeeStatusChartInstance?.destroy();

    const total = this.stats()?.totalEmployees || 0;
    const active = this.stats()?.activeEmployees || 0;
    const invited = this.stats()?.invitedEmployees || 0;
    const pending = Math.max(total - active - invited, 0);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Invited', 'Pending'],
        datasets: [{
          data: [active, invited, pending],
          backgroundColor: ['#20a36a', '#f0a33a', '#dfe5ee'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } },
        },
      },
    };

    this.employeeStatusChartInstance = new Chart(canvas, config);
  }

  private renderTopSkillsChart(): void {
    const canvas = this.topSkillsChart?.nativeElement;
    if (!canvas) return;

    this.topSkillsChartInstance?.destroy();

    const topSkills = (this.stats()?.topSkills || []).slice(0, 6);
    if (!topSkills.length) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topSkills.map(skill => skill.skillName),
        datasets: [{
          label: 'Employees with skill',
          data: topSkills.map(skill => skill.employeeCount),
          backgroundColor: ['#4966c8', '#3157c7', '#20a36a', '#f0a33a', '#7545c2', '#16804f'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { ticks: { maxRotation: 0 } },
        },
      },
    };

    this.topSkillsChartInstance = new Chart(canvas, config);
  }

  getActivePercentage(): number {
    const total = this.stats()?.totalEmployees || 0;
    return total ? ((this.stats()?.activeEmployees || 0) / total) * 100 : 0;
  }

  getInvitedPercentage(): number {
    const total = this.stats()?.totalEmployees || 0;
    return total ? ((this.stats()?.invitedEmployees || 0) / total) * 100 : 0;
  }

  getActiveRateLabel(): string {
    return `${Math.round(this.getActivePercentage())}%`;
  }

  getAverageSkillsPerEmployee(): number {
    const totalEmployees = this.stats()?.totalEmployees || 0;
    const totalSkills = this.stats()?.totalSkills || 0;
    return totalEmployees ? Number((totalSkills / totalEmployees).toFixed(1)) : 0;
  }

  getTopSkillName(): string {
    return this.stats()?.topSkills?.[0]?.skillName || 'No skill data';
  }

  getTopSkillCount(): number {
    return this.stats()?.topSkills?.[0]?.employeeCount || 0;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Never';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleDateString(this.getLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Never';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString(this.getLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  }

  private getLocale(): string {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'en-US';
  }

  getPaginationLabel(): string {
    const pagination = this.assessments()?.pagination;
    if (!pagination || pagination.totalRecords === 0) return 'Showing 0 to 0 of 0 records';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.totalRecords);
    return `Showing ${start} to ${end} of ${pagination.totalRecords} records`;
  }

  get pages(): number[] {
    return Array.from({ length: this.assessments()?.pagination.totalPages || 1 }, (_, index) => index + 1);
  }

  loadPrismAssessments(): void {
    const user = this.authService.user();
    const organisationId = user?.organisationId || user?.tenantId;
    
    if (!organisationId) {
      console.warn('No organisation ID or tenant ID found for user:', user);
      // Set empty state instead of just warning
      this.prismAssessments.set({
        organisationId: '',
        assessments: [],
        total: 0,
        summary: {
          notStarted: 0,
          inProgress: 0,
          completed: 0,
          unlocked: 0,
        },
      });
      return;
    }

    console.log('Loading PRISM assessments for organisation:', organisationId);
    
    this.assessmentService.getOrganisationAssessments(organisationId).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('PRISM assessments loaded:', response.data);
        this.prismAssessments.set(response.data);
      },
      error: (error) => {
        console.error('Error loading PRISM assessments:', error);
        // Set empty state on error
        this.prismAssessments.set({
          organisationId: organisationId,
          assessments: [],
          total: 0,
          summary: {
            notStarted: 0,
            inProgress: 0,
            completed: 0,
            unlocked: 0,
          },
        });
      },
    });
  }

  getSelectedQuestionnaireType(employeeId: string): number {
    return this.selectedQuestionnaireTypes()[employeeId] || 1;
  }

  setSelectedQuestionnaireType(employeeId: string, event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isInteger(value)) return;
    this.selectedQuestionnaireTypes.update((selected) => ({ ...selected, [employeeId]: value }));
  }

  createAssessment(employeeId: string, qTypeId: number): void {
    if (!employeeId) return;

    this.assessmentService.createAssessment(employeeId, qTypeId).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('Assessment created:', response.data);
        this.prismAssessments.update((current) => current ? {
          ...current,
          assessments: current.assessments.map((item) => item.employeeId.toString() === employeeId
            ? { ...item, assessment: { questStatus: response.data.questStatus, questStatusLabel: response.data.questStatusLabel, hasQuestionnaire: true, isUnlocked: false, actionUrl: response.data.actionUrl, lastFetchedAt: new Date().toISOString() } }
            : item),
        } : current);
        this.loadPrismAssessments();
      },
      error: (error) => {
        console.error('Error creating assessment:', error);
        this.alertService.error(error.error?.message || 'Failed to create assessment');
      },
    });
  }

  async unlockAssessment(employeeId: string): Promise<void> {
    if (!employeeId) return;

    const confirmed = await this.alertService.confirm('Are you sure you want to unlock this assessment report?', 'Unlock Report', 'Unlock', 'Cancel');
    if (!confirmed) {
      return;
    }

    this.assessmentService.unlockAssessmentReport(employeeId).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('Assessment unlocked:', response.data);
        this.prismAssessments.update((current) => current ? {
          ...current,
          assessments: current.assessments.map((item) => item.employeeId.toString() === employeeId && item.assessment
            ? { ...item, assessment: { ...item.assessment, questStatus: response.data.questStatus, questStatusLabel: response.data.questStatusLabel, isUnlocked: true, lastFetchedAt: new Date().toISOString() } }
            : item),
        } : current);
        this.loadPrismAssessments();
      },
      error: (error) => {
        console.error('Error unlocking assessment:', error);
        this.alertService.error(error.error?.message || 'Failed to unlock assessment');
      },
    });
  }

  viewAssessmentReport(employee: EmployeeAssessment): void {
    this.router.navigate(['/company/prism-report', employee.employeeId], {
      queryParams: { name: employee.fullName },
    });
  }

  @HostListener('window:focus')
  refreshPrismAssessmentsOnFocus(): void {
    if (this.activeTab() === 'assessments') this.loadPrismAssessments();
  }

  openPrismAction(url?: string): void {
    if (url) window.open(url, '_blank');
  }

  getStatusBadgeClass(status: PrismQuestStatus | undefined): string {
    if (!status) return 'badge-gray';
    return this.questStatusConfig[status]?.badgeClass || 'badge-gray';
  }

  getStatusLabel(status: PrismQuestStatus | undefined): string {
    if (!status) return 'Not Started';
    return this.questStatusConfig[status]?.label || 'Unknown';
  }

  canTakeAssessment(employee: EmployeeAssessment): boolean {
    return employee.assessment !== null && 
           (employee.assessment.questStatus === 1 || employee.assessment.questStatus === 2) && 
           employee.assessment.hasQuestionnaire;
  }

  canUnlockAssessment(employee: EmployeeAssessment): boolean {
    return employee.assessment !== null && 
           (employee.assessment.questStatus === 3 || employee.assessment.questStatus === 4) &&
           !employee.assessment.isUnlocked;
  }

  canViewReport(employee: EmployeeAssessment): boolean {
    return employee.assessment !== null && employee.assessment.isUnlocked;
  }
}
