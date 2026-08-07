import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { DashboardService, EmployeeNotification } from '../../core/services/dashboard.service';
import { DocumentService } from '../../core/services/document.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { PrismAssessmentFrameComponent } from '../../shared/components/prism-assessment-frame/prism-assessment-frame';

Chart.register(...registerables);

export interface SkillItem {
  _id?: string;
  skillName: string;
  skillLevel: number;
  skillLevelLabel: string;
  interestLevel: number;
}

export interface Document {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  description?: string;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verificationDate?: Date;
  verificationNotes?: string;
  filePath?: string;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PrismAssessmentFrameComponent],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.scss',
})
export class EmployeeDashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly documentService = inject(DocumentService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);
  readonly prismActionUrl = signal<string | null>(null);

  @ViewChild('skillDistributionChart') skillDistributionChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topSkillsChart') topSkillsChart?: ElementRef<HTMLCanvasElement>;

  private skillDistributionChartInstance: Chart | null = null;
  private topSkillsChartInstance: Chart | null = null;

  readonly employeeStats = signal<any>(null);
  readonly employeeNotifications = signal<EmployeeNotification[]>([]);
  readonly notificationsLoading = signal(true);
  readonly notificationsError = signal<string | null>(null);
  readonly notificationFilter = signal<'recent' | 'unread' | 'read'>('recent');
  readonly loading = signal(true);

  // Document-related signals
  readonly documents = signal<Document[]>([]);
  readonly documentSummary = signal<any>(null);
  readonly documentsLoading = signal(true);
  readonly documentsError = signal<string | null>(null);
  readonly uploadingDocument = signal(false);
  readonly showDocumentUploadForm = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly documentDescription = signal('');
  readonly selectedDocumentType = signal('resume');

  readonly unreadNotificationsCount = computed(() =>
    this.employeeNotifications().filter((notification) => !notification.isRead).length,
  );

  readonly skillProgressPercent = computed(() => {
    const average = this.employeeStats()?.summary?.averageSkillLevel ?? this.employeeStats()?.averageSkillLevel ?? 0;
    return Math.min(100, Math.max(0, Math.round((average / 5) * 100)));
  });

  readonly interestProgressPercent = computed(() => {
    const average = this.employeeStats()?.summary?.averageInterestLevel ?? this.employeeStats()?.averageInterestLevel ?? 0;
    return Math.min(100, Math.max(0, Math.round((average / 5) * 100)));
  });

  readonly questionnaireProgressPercent = computed(() => {
    const assigned = this.employeeStats()?.assignedQuestionnaires ?? 0;
    const completed = this.employeeStats()?.completedQuestionnaires ?? 0;
    if (!assigned) return 0;
    return Math.min(100, Math.max(0, Math.round((completed / assigned) * 100)));
  });

  readonly recentActivities = computed(() => {
    const activities = [...(this.employeeStats()?.recentActivities || [])];

    this.employeeNotifications().forEach((notification) => {
      activities.push({
        type: notification.isRead ? 'notification' : 'reminder',
        title: notification.title,
        description: notification.message,
        time: notification.createdAt || new Date().toISOString(),
        icon: notification.isRead ? 'bi-bell-fill' : 'bi-bell',
      });
    });

    return activities
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 6);
  });

  // PRISM Assessment signals
  readonly myAssessments = this.assessmentService.myAssessments;
  readonly assessmentLoading = this.assessmentService.assessmentLoading;
  readonly assessmentError = this.assessmentService.assessmentError;

  // Expose Math to template
  Math = Math;
  parseFloat = parseFloat;

  ngOnInit(): void {
    this.loadEmployeeStats();
    this.loadEmployeeNotifications();
    this.loadDocuments();
    this.loadDocumentSummary();
    this.loadMyAssessments();
  }

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private destroyCharts(): void {
    this.skillDistributionChartInstance?.destroy();
    this.topSkillsChartInstance?.destroy();
    this.skillDistributionChartInstance = null;
    this.topSkillsChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined') return;
    if (!this.employeeStats()) return;

    setTimeout(() => {
      this.renderSkillDistributionChart();
      this.renderTopSkillsChart();
    }, 0);
  }

  private renderSkillDistributionChart(): void {
    const canvas = this.skillDistributionChart?.nativeElement;
    if (!canvas) return;

    this.skillDistributionChartInstance?.destroy();

    const topSkills = this.employeeStats()?.topSkills || [];
    
    // Count skills by level
    const levelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    topSkills.forEach((skill: any) => {
      const level = skill.skillLevel || 0;
      if (level >= 1 && level <= 5) {
        levelCounts[level]++;
      }
    });

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Beginner (1)', 'Intermediate (2)', 'Advanced (3)', 'Expert (4)', 'Master (5)'],
        datasets: [{
          data: [levelCounts[1], levelCounts[2], levelCounts[3], levelCounts[4], levelCounts[5]],
          backgroundColor: ['#fbbf24', '#60a5fa', '#34d399', '#8b5cf6', '#ec4899'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              usePointStyle: true, 
              padding: 12,
              font: { size: 11 }
            } 
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} skills (${percentage}%)`;
              }
            }
          }
        },
      },
    };

    this.skillDistributionChartInstance = new Chart(canvas, config);
  }

  private renderTopSkillsChart(): void {
    const canvas = this.topSkillsChart?.nativeElement;
    if (!canvas) return;

    this.topSkillsChartInstance?.destroy();

    const topSkills = ((this.employeeStats()?.topSkills || []) as any[]).slice(0, 6);
    if (!topSkills.length) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topSkills.map((skill: any) => skill.skillName),
        datasets: [
          {
            label: 'Skill Level',
            data: topSkills.map((skill: any) => skill.skillLevel),
            backgroundColor: '#3157c7',
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            label: 'Interest Level',
            data: topSkills.map((skill: any) => skill.interestLevel),
            backgroundColor: '#f97316',
            borderRadius: 6,
            yAxisID: 'y',
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value}/5`;
              }
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            max: 5,
            ticks: { 
              stepSize: 1,
              callback: (value) => `${value}/5`
            },
            title: {
              display: true,
              text: 'Level (1-5)'
            }
          },
          x: { 
            ticks: { 
              maxRotation: 45,
              minRotation: 45,
              font: { size: 10 }
            } 
          },
        },
      },
    };

    this.topSkillsChartInstance = new Chart(canvas, config);
  }

  private loadEmployeeStats(): void {
    this.loading.set(true);

    this.dashboardService.getEmployeeStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeStats.set(response.data);
          this.loading.set(false);
          this.renderCharts();
        },
        error: (error) => {
          console.error('Error loading employee stats:', error);
          this.loading.set(false);
        },
      });
  }

  private loadEmployeeNotifications(): void {
    this.notificationsLoading.set(true);
    this.notificationsError.set(null);

    this.dashboardService.getEmployeeNotifications(this.notificationFilter(), 1, 5)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeNotifications.set(response.data?.notifications || []);
          this.notificationsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee notifications:', error);
          this.notificationsError.set('Unable to load notifications right now.');
          this.notificationsLoading.set(false);
        },
      });
  }

  markNotificationAsRead(notification: EmployeeNotification): void {
    if (!notification._id || notification.isRead) return;

    this.dashboardService.markEmployeeNotificationAsRead(notification._id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.employeeNotifications.update((list) => list.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item)));
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.notificationsError.set('Unable to update that notification.');
        },
      });
  }

  formatNotificationDate(value?: string | null): string {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  }

  getCurrentUserName(): string {
    return this.authService.user()?.fullName || 'User';
  }

  getRolePrefix(): string {
    return this.authService.role() || 'employee';
  }

  getUserInitials(): string {
    const name = this.getCurrentUserName();
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

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getEmployeeTitle(): string {
    return this.employeeStats()?.employeeProfile?.title || this.authService.user()?.fullName || 'Employee';
  }

  getEmployeeDepartment(): string {
    return this.employeeStats()?.employeeProfile?.department || 'General';
  }

  getAverageSkillLevel(): string {
    const avg = this.employeeStats()?.summary?.averageSkillLevel ?? this.employeeStats()?.averageSkillLevel;
    return typeof avg === 'number' ? avg.toFixed(2) : '0.00';
  }

  getSkillLevelPercentage(): number {
    const avg = this.employeeStats()?.summary?.averageSkillLevel ?? (this.employeeStats()?.averageSkillLevel ?? 0);
    return (avg / 5) * 100;
  }

  getAverageInterestLevel(): string {
    const avg = this.employeeStats()?.summary?.averageInterestLevel ?? this.employeeStats()?.averageInterestLevel;
    return typeof avg === 'number' ? avg.toFixed(2) : '0.00';
  }

  getInterestLevelPercentage(): number {
    const avg = this.employeeStats()?.summary?.averageInterestLevel ?? (this.employeeStats()?.averageInterestLevel ?? 0);
    return (avg / 5) * 100;
  }

  getTopSkills(): SkillItem[] {
    const rawSkills = this.employeeStats()?.topSkills ?? this.employeeStats()?.mySkills ?? [];
    return (Array.isArray(rawSkills) ? rawSkills : []).map((skill: any, index: number) => ({
      _id: skill?._id ?? `skill-${index}`,
      skillName: skill?.skillName ?? skill?.skill_name ?? 'Skill',
      skillLevel: Number(skill?.skillLevel ?? skill?.skill_level ?? skill?.progress ?? 0),
      skillLevelLabel: this.getSkillLevelLabel(Number(skill?.skillLevel ?? skill?.skill_level ?? skill?.progress ?? 0)),
      interestLevel: Number(skill?.interestLevel ?? skill?.interest_level ?? 0),
    }));
  }

  getKeenToImproveSkills(): SkillItem[] {
    const rawSkills = this.employeeStats()?.keenToImprove ?? this.employeeStats()?.improveSkills ?? [];
    return (Array.isArray(rawSkills) ? rawSkills : []).map((skill: any, index: number) => ({
      _id: skill?._id ?? `improve-${index}`,
      skillName: skill?.skillName ?? skill?.skill_name ?? 'Skill',
      skillLevel: Number(skill?.skillLevel ?? skill?.skill_level ?? 0),
      skillLevelLabel: this.getSkillLevelLabel(Number(skill?.skillLevel ?? skill?.skill_level ?? 0)),
      interestLevel: Number(skill?.interestLevel ?? skill?.interest_level ?? 0),
    }));
  }

  private getSkillLevelLabel(level: number): string {
    if (level >= 4) return 'Advanced';
    if (level >= 3) return 'Proficient';
    if (level >= 2) return 'Growing';
    return 'Beginner';
  }

  getActionStatusClass(status: string): string {
    if (!status) return 'text-muted';
    const normalized = status.toLowerCase();
    if (normalized.includes('complete')) return 'text-success';
    if (normalized.includes('progress') || normalized.includes('review')) return 'text-warning';
    return 'text-primary';
  }

  getCareerStatusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'completed') return 'text-success';
    if (normalized === 'in_progress') return 'text-warning';
    return 'text-muted';
  }

  // Document-related methods
  private loadDocuments(): void {
    this.documentsLoading.set(true);
    this.documentsError.set(null);

    this.documentService.getMyDocuments()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.documents.set(response.data);
          }
          this.documentsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.documentsError.set('Failed to load documents');
          this.documentsLoading.set(false);
        }
      });
  }

  private loadDocumentSummary(): void {
    this.documentService.getDocumentSummary()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.documentSummary.set(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading document summary:', error);
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  uploadDocument(): void {
    const file = this.selectedFile();
    const docType = this.selectedDocumentType();
    const description = this.documentDescription();

    if (!file || !docType) {
      this.documentsError.set('Please select a file and document type');
      return;
    }

    this.uploadingDocument.set(true);
    this.documentsError.set(null);

    this.documentService.uploadDocument(file, docType, description)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.documents.update((docs) => [response.data, ...docs]);
            this.loadDocumentSummary();
            this.showDocumentUploadForm.set(false);
            this.resetDocumentForm();
            this.uploadingDocument.set(false);
          }
        },
        error: (error) => {
          console.error('Error uploading document:', error);
          this.documentsError.set(error.error?.message || 'Failed to upload document');
          this.uploadingDocument.set(false);
        }
      });
  }

  deleteDocument(documentId: string): void {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    this.documentService.deleteDocument(documentId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.documents.update((docs) => docs.filter((doc) => doc._id !== documentId));
          this.loadDocumentSummary();
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          this.documentsError.set('Failed to delete document');
        }
      });
  }

  viewDocument(document: Document): void {
    this.documentService.viewFile(document.filePath || '', document.fileName);
  }

  resetDocumentForm(): void {
    this.selectedFile.set(null);
    this.documentDescription.set('');
    this.selectedDocumentType.set('resume');
  }

  getVerificationStatusClass(status: string): string {
    switch (status) {
      case 'verified':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'pending':
      default:
        return 'badge-warning';
    }
  }

  getVerificationStatusIcon(status: string): string {
    switch (status) {
      case 'verified':
        return 'bi-check-circle-fill';
      case 'rejected':
        return 'bi-x-circle-fill';
      case 'pending':
      default:
        return 'bi-clock-history';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // PRISM Assessment methods
  private loadMyAssessments(): void {
    this.assessmentService.fetchMyAssessments().pipe(take(1)).subscribe({
      error: (err) => console.error('Error loading PRISM assessments:', err),
    });
  }

  takeAssessment(url: string): void {
    if (url) this.prismActionUrl.set(url);
  }

  closePrismAction(): void {
    this.prismActionUrl.set(null);
  }

  @HostListener('window:focus')
  refreshAssessmentsOnFocus(): void {
    this.loadMyAssessments();
  }

  viewAssessmentReport(): void {
    const employee = this.authService.user();
    if (!employee?._id) return;
    this.router.navigate(['/employee/prism-report', employee._id], {
      queryParams: { name: employee.fullName },
    });
  }

  getAssessmentActionLabel(assessment: any): string {
    if (assessment.error) return 'Error';
    if (!assessment.isCompleted) return 'Take Assessment';
    if (assessment.isCompleted && !assessment.isPaidFor) return 'Complete Payment';
    if (assessment.isCompleted && assessment.isPaidFor) return 'View Report';
    return 'View';
  }

  getAssessmentStatusBadgeClass(questStatus: number): string {
    if (questStatus === 1 || questStatus === 2) return 'badge-blue';
    if (questStatus === 3 || questStatus === 4) return 'badge-yellow';
    if (questStatus === 6) return 'badge-green';
    return 'badge-gray';
  }
}
