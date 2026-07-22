import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { DashboardService, CompanyAbout, CompanyAssessments } from '../../../core/services/dashboard.service';
import { AdminDashboardComponent } from '../../admin-dashboard/admin-dashboard';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminDashboardComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  // Admin stats
  readonly adminStats = signal<any>(null);
  
  // Company stats
  readonly companyStats = signal<any>(null);
  
  // Employee stats
  readonly employeeStats = signal<any>(null);
  
  readonly loading = signal(true);
  readonly companyDashboardTab = signal<'summary' | 'skills' | 'trends' | 'assessments' | 'about'>('summary');
  readonly selectedTrendCategory = signal('Finance and Accounting');
  readonly trendCategories = [
    'Finance and Accounting',
    'Information and Communications Technology (ICT)',
    'General Computer Use',
    'Personal and Interpersonal'
  ];

  readonly companyAbout = signal<CompanyAbout | null>(null);
  readonly companyAssessments = signal<CompanyAssessments | null>(null);
  readonly aboutLoading = signal(false);
  readonly assessmentsLoading = signal(false);
  readonly assessmentsPage = signal(1);
  readonly assessmentsPerPage = signal(10);

  get currentUserName(): string {
    const user = this.authService.user();
    return user?.fullName || 'User';
  }

  get currentRole(): string {
    return this.authService.role() || '';
  }

  isAdmin = computed(() => this.authService.isAdmin());
  isCompany = computed(() => this.authService.isCompany());
  isEmployee = computed(() => this.authService.isEmployee());

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  private loadDashboardStats(): void {
    this.loading.set(true);
    
    const role = this.authService.role();

    if (role === 'admin') {
      this.loadAdminStats();
    } else if (role === 'company') {
      this.loadCompanyStats();
    } else if (role === 'employee') {
      this.loadEmployeeStats();
    } else {
      this.loading.set(false);
    }
  }

  private loadAdminStats(): void {
    this.dashboardService.getAdminStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.adminStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading admin stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadCompanyStats(): void {
    this.dashboardService.getCompanyStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companyStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading company stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadEmployeeStats(): void {
    this.dashboardService.getEmployeeStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee stats:', error);
          this.loading.set(false);
        }
      });
  }

  getRolePrefix(): string {
    const role = this.authService.role();
    return role || 'admin';
  }

  selectCompanyDashboardTab(tab: 'summary' | 'skills' | 'trends' | 'assessments' | 'about'): void {
    this.companyDashboardTab.set(tab);

    if (tab === 'about' && !this.companyAbout()) {
      this.loadCompanyAbout();
    }

    if (tab === 'assessments' && !this.companyAssessments()) {
      this.loadCompanyAssessments();
    }
  }

  private loadCompanyAbout(): void {
    this.aboutLoading.set(true);

    this.dashboardService.getCompanyAbout()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companyAbout.set(response.data);
          this.aboutLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading company about data:', error);
          this.aboutLoading.set(false);
        },
      });
  }

  loadCompanyAssessments(page = this.assessmentsPage(), limit = this.assessmentsPerPage()): void {
    this.assessmentsLoading.set(true);

    this.dashboardService.getCompanyAssessments(page, limit)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companyAssessments.set(response.data);
          this.assessmentsPage.set(response.data.pagination.page);
          this.assessmentsPerPage.set(response.data.pagination.limit);
          this.assessmentsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading company assessments:', error);
          this.assessmentsLoading.set(false);
        },
      });
  }

  onAssessmentsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const limit = parseInt(select.value, 10) || 10;
    this.assessmentsPerPage.set(limit);
    this.assessmentsPage.set(1);
    this.loadCompanyAssessments(1, limit);
  }

  goToAssessmentsPage(page: number): void {
    const totalPages = this.companyAssessments()?.pagination.totalPages || 1;
    if (page < 1 || page > totalPages) {
      return;
    }
    this.assessmentsPage.set(page);
    this.loadCompanyAssessments(page, this.assessmentsPerPage());
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '';
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  }

  formatDateWithRelative(dateStr: string | null | undefined): string {
    const formatted = this.formatDate(dateStr);
    if (!formatted) {
      return 'Never';
    }
    const relative = this.formatRelativeTime(dateStr);
    return relative ? `${formatted} (${relative})` : formatted;
  }

  formatRelativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '';
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    if (diffDays === 1) {
      return '1 day ago';
    }
    return `${diffDays} days ago`;
  }

  getAssessmentsPaginationLabel(): string {
    const pagination = this.companyAssessments()?.pagination;
    if (!pagination || pagination.totalRecords === 0) {
      return 'Showing 0 to 0 of 0 records';
    }

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.totalRecords);
    return `Showing ${start} to ${end} of ${pagination.totalRecords} records`;
  }

  getAssessmentPageNumbers(): number[] {
    const totalPages = this.companyAssessments()?.pagination?.totalPages || 1;
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  selectTrendCategory(category: string): void {
    this.selectedTrendCategory.set(category);
  }

  getLatestUsersByStatus(status: string): any[] {
    const employees = this.companyStats()?.recentEmployees || [];
    return employees.filter((employee: any) => {
      const normalizedStatus = (employee.accountStatus || '').toLowerCase();
      return normalizedStatus === status.toLowerCase();
    });
  }

  getRecentJoinersCount(): number {
    const employees = this.companyStats()?.recentEmployees || [];
    return employees.filter((employee: any) => {
      const normalizedStatus = (employee.accountStatus || '').toLowerCase();
      return normalizedStatus === 'joined' || normalizedStatus === 'active';
    }).length;
  }

  getPendingInvitesCount(): number {
    const employees = this.companyStats()?.recentEmployees || [];
    const invitedCount = employees.filter((employee: any) => {
      const normalizedStatus = (employee.accountStatus || '').toLowerCase();
      return normalizedStatus === 'invited';
    }).length;

    return invitedCount || this.companyStats()?.invitedEmployees || 0;
  }

  // Employee dashboard methods
  getUserInitials(): string {
    const name = this.currentUserName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toLowerCase();
    }
    return name.substring(0, 2).toLowerCase();
  }

  getPersonInitials(fullName: string): string {
    if (!fullName) return 'SP';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getAverageSkillLevel(): string {
    const avg = this.employeeStats()?.averageSkillLevel || 3.05;
    return typeof avg === 'number' ? avg.toFixed(2) : '3.05';
  }

  getSkillLevelPercentage(): number {
    const avg = this.employeeStats()?.averageSkillLevel || 3.05;
    return ((typeof avg === 'number' ? avg : 3.05) / 5) * 100;
  }

  getAverageInterestLevel(): string {
    const avg = this.employeeStats()?.averageInterestLevel || 2.90;
    return typeof avg === 'number' ? avg.toFixed(2) : '2.90';
  }

  getInterestLevelPercentage(): number {
    const avg = this.employeeStats()?.averageInterestLevel || 2.90;
    return ((typeof avg === 'number' ? avg : 2.90) / 5) * 100;
  }

  getCategorySegment(category: any, level: string): number {
    if (!category || !category.levels) return 25;
    
    const levelMap: { [key: string]: string } = {
      'expert': '5',
      'advanced': '4',
      'intermediate': '3',
      'beginner': '2'
    };
    
    const levelKey = levelMap[level];
    const count = category.levels?.[levelKey] || 0;
    const total = category.count || 1;
    
    return (count / total) * 100;
  }

  // Company dashboard methods
  getCompanyActivePercentage(): number {
    const total = this.companyStats()?.totalEmployees || 1;
    const active = this.companyStats()?.activeEmployees || 0;
    return (active / total) * 100;
  }

  getCompanySkillsPercentage(): number {
    const maxSkills = 500; // Adjust this based on your expected max
    const skills = this.companyStats()?.totalSkills || 0;
    return Math.min((skills / maxSkills) * 100, 100);
  }

  getEmployeeStatusPercentage(status: string): number {
    const total = this.companyStats()?.totalEmployees || 1;
    if (status === 'active') {
      const active = this.companyStats()?.activeEmployees || 0;
      return (active / total) * 100;
    } else if (status === 'invited') {
      const invited = this.companyStats()?.invitedEmployees || 0;
      return (invited / total) * 100;
    }
    return 0;
  }

  // Make Math available in template
  Math = Math;
}