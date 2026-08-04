import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, SkillAnalytics } from '../../core/services/analytics.service';
import { ExportService } from '../../core/services/export.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-skill-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skill-analytics.html',
  styleUrls: ['./skill-analytics.scss'],
})
export class SkillAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly exportService = inject(ExportService);

  @ViewChild('skillLevelChart') skillLevelChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('adoptionRateChart') adoptionRateChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthTrendChart') growthTrendChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('gapAnalysisChart') gapAnalysisChart?: ElementRef<HTMLCanvasElement>;

  private skillLevelChartInstance: Chart | null = null;
  private adoptionRateChartInstance: Chart | null = null;
  private growthTrendChartInstance: Chart | null = null;
  private gapAnalysisChartInstance: Chart | null = null;

  readonly analytics = signal<SkillAnalytics | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);
  
  // Filter signals
  readonly startDate = signal<string>(this.getDefaultStartDate());
  readonly endDate = signal<string>(this.getDefaultEndDate());
  readonly filterApplied = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngAfterViewInit(): void {
    if (this.analytics()) {
      this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadAnalytics(startDate?: string, endDate?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getSkillAnalytics(startDate, endDate).subscribe({
      next: (response) => {
        if (response?.data) {
          this.analytics.set(response.data);
          setTimeout(() => this.renderCharts(), 100);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.error.set('Failed to load skill analytics');
        this.loading.set(false);
      },
    });
  }

  /**
   * Export analytics data to CSV
   */
  exportToCSV(): void {
    if (!this.analytics()) return;

    this.exporting.set(true);
    const data = this.analytics()!;

    try {
      // Prepare flattened data for export
      const exportData = this.exportService.flattenData(
        data.skillReports.map(report => ({
          'Skill Name': report.skillName,
          'Category': report.categoryName,
          'Total Employees': report.totalEmployeesWithSkill,
          'Total Assignments': report.totalAssignments,
          'Average Score': report.averageScore,
          'Adoption Rate (%)': report.adoptionRate,
          'Expert Level': report.levelBreakdown.expert,
          'Advanced Level': report.levelBreakdown.advanced,
          'Intermediate Level': report.levelBreakdown.intermediate,
          'Beginner Level': report.levelBreakdown.beginner,
        })),
        []
      );

      const filename = `Skills-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToCSV(
        exportData,
        filename,
        [
          'Skill Name',
          'Category',
          'Total Employees',
          'Total Assignments',
          'Average Score',
          'Adoption Rate (%)',
          'Expert Level',
          'Advanced Level',
          'Intermediate Level',
          'Beginner Level',
        ]
      );

      // Show success message
      console.log('Skills analytics exported successfully');
    } catch (error) {
      console.error('Error exporting skills analytics:', error);
      this.error.set('Failed to export skills analytics');
    } finally {
      this.exporting.set(false);
    }
  }

  /**
   * Export analytics data to Excel
   */
  exportToExcel(): void {
    if (!this.analytics()) return;

    this.exporting.set(true);
    const data = this.analytics()!;

    try {
      // Prepare flattened data for export
      const exportData = this.exportService.flattenData(
        data.skillReports.map(report => ({
          'Skill Name': report.skillName,
          'Category': report.categoryName,
          'Total Employees': report.totalEmployeesWithSkill,
          'Total Assignments': report.totalAssignments,
          'Average Score': report.averageScore,
          'Adoption Rate (%)': report.adoptionRate,
          'Expert Level': report.levelBreakdown.expert,
          'Advanced Level': report.levelBreakdown.advanced,
          'Intermediate Level': report.levelBreakdown.intermediate,
          'Beginner Level': report.levelBreakdown.beginner,
        })),
        []
      );

      const filename = `Skills-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToExcel(
        exportData,
        filename,
        [
          'Skill Name',
          'Category',
          'Total Employees',
          'Total Assignments',
          'Average Score',
          'Adoption Rate (%)',
          'Expert Level',
          'Advanced Level',
          'Intermediate Level',
          'Beginner Level',
        ]
      );

      // Show success message
      console.log('Skills analytics exported successfully');
    } catch (error) {
      console.error('Error exporting skills analytics:', error);
      this.error.set('Failed to export skills analytics');
    } finally {
      this.exporting.set(false);
    }
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  applyFilter(): void {
    this.filterApplied.set(true);
    this.loadAnalytics(this.startDate(), this.endDate());
    console.log('Filter applied:', { start: this.startDate(), end: this.endDate() });
  }

  resetFilter(): void {
    this.startDate.set(this.getDefaultStartDate());
    this.endDate.set(this.getDefaultEndDate());
    this.filterApplied.set(false);
    this.loadAnalytics();
    console.log('Filter reset to defaults');
  }

  /**
   * Get formatted date for filename
   */
  private getFormattedDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
  }

  private destroyCharts(): void {
    this.skillLevelChartInstance?.destroy();
    this.adoptionRateChartInstance?.destroy();
    this.growthTrendChartInstance?.destroy();
    this.gapAnalysisChartInstance?.destroy();
    this.skillLevelChartInstance = null;
    this.adoptionRateChartInstance = null;
    this.growthTrendChartInstance = null;
    this.gapAnalysisChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined' || !this.analytics()) return;

    this.renderSkillLevelChart();
    this.renderAdoptionRateChart();
    this.renderGrowthTrendChart();
    this.renderGapAnalysisChart();
  }

  private renderSkillLevelChart(): void {
    const canvas = this.skillLevelChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.skillLevelChartInstance?.destroy();

    const data = this.analytics()!.averageSkillLevel.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map((skill) => skill.skillName),
        datasets: [
          {
            label: 'Average Score',
            data: data.map((skill) => Math.round(skill.avgScore)),
            backgroundColor: '#4966c8',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } },
        },
      },
    };

    this.skillLevelChartInstance = new Chart(canvas, config);
  }

  private renderAdoptionRateChart(): void {
    const canvas = this.adoptionRateChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.adoptionRateChartInstance?.destroy();

    const data = this.analytics()!.mostPopularSkills.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map((skill) => skill.skillName),
        datasets: [
          {
            data: data.map((skill) => skill.adoptionRate),
            backgroundColor: [
              '#4966c8',
              '#3157c7',
              '#20a36a',
              '#f0a33a',
              '#7545c2',
              '#16804f',
              '#ff6b6b',
              '#ff9ff3',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } },
        },
      },
    };

    this.adoptionRateChartInstance = new Chart(canvas, config);
  }

  private renderGrowthTrendChart(): void {
    const canvas = this.growthTrendChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.growthTrendChartInstance?.destroy();

    // Group by skill and get recent trends
    const skillGrowth: { [key: string]: number } = {};
    this.analytics()!.skillGrowthTrend.slice(0, 20).forEach((trend) => {
      const skillName = trend._id.skillName;
      skillGrowth[skillName] = (skillGrowth[skillName] || 0) + trend.count;
    });

    const topSkills = Object.entries(skillGrowth)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: topSkills.map((s) => s[0]),
        datasets: [
          {
            label: 'Skill Assignments',
            data: topSkills.map((s) => s[1]),
            borderColor: '#4966c8',
            backgroundColor: 'rgba(73, 102, 200, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#4966c8',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { usePointStyle: true } },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };

    this.growthTrendChartInstance = new Chart(canvas, config);
  }

  private renderGapAnalysisChart(): void {
    const canvas = this.gapAnalysisChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.gapAnalysisChartInstance?.destroy();

    const data = this.analytics()!.skillGapAnalysis.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map((skill) => skill.skillName),
        datasets: [
          {
            label: 'Average Score',
            data: data.map((skill) => skill.averageScore),
            backgroundColor: '#ff6b6b',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } },
        },
      },
    };

    this.gapAnalysisChartInstance = new Chart(canvas, config);
  }

  formatDate(month: number, year: number): string {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
