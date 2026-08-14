import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, SkillCategoryAnalytics } from '../../core/services/analytics.service';
import { ExportService } from '../../core/services/export.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-skill-category-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skill-category-analytics.html',
  styleUrls: ['./skill-category-analytics.scss'],
})
export class SkillCategoryAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly exportService = inject(ExportService);

  @ViewChild('skillsPerCategoryChart') skillsPerCategoryChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeesPerCategoryChart') employeesPerCategoryChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('adoptionRateChart') adoptionRateChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('levelDistributionChart') levelDistributionChart?: ElementRef<HTMLCanvasElement>;

  private skillsPerCategoryChartInstance: Chart | null = null;
  private employeesPerCategoryChartInstance: Chart | null = null;
  private adoptionRateChartInstance: Chart | null = null;
  private levelDistributionChartInstance: Chart | null = null;

  readonly analytics = signal<SkillCategoryAnalytics | null>(null);
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

    this.analyticsService.getSkillCategoryAnalytics(startDate, endDate).subscribe({
      next: (response) => {
        if (response?.data) {
          this.analytics.set(response.data);
          setTimeout(() => this.renderCharts(), 100);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.error.set('Failed to load skill category analytics');
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
        data.categoryUsageReports.map(report => ({
          'Category Name': report.categoryName,
          'Total Skills': report.totalSkills,
          'Total Employees': report.totalEmployeesUsing,
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

      const filename = `Skill-Categories-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToCSV(
        exportData,
        filename,
        [
          'Category Name',
          'Total Skills',
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
      console.log('Skill categories analytics exported successfully');
    } catch (error) {
      console.error('Error exporting skill categories analytics:', error);
      this.error.set('Failed to export skill categories analytics');
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
        data.categoryUsageReports.map(report => ({
          'Category Name': report.categoryName,
          'Total Skills': report.totalSkills,
          'Total Employees': report.totalEmployeesUsing,
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

      const filename = `Skill-Categories-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToExcel(
        exportData,
        filename,
        [
          'Category Name',
          'Total Skills',
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
      console.log('Skill categories analytics exported successfully');
    } catch (error) {
      console.error('Error exporting skill categories analytics:', error);
      this.error.set('Failed to export skill categories analytics');
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
    this.skillsPerCategoryChartInstance?.destroy();
    this.employeesPerCategoryChartInstance?.destroy();
    this.adoptionRateChartInstance?.destroy();
    this.levelDistributionChartInstance?.destroy();
    this.skillsPerCategoryChartInstance = null;
    this.employeesPerCategoryChartInstance = null;
    this.adoptionRateChartInstance = null;
    this.levelDistributionChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined' || !this.analytics()) return;

    this.renderSkillsPerCategoryChart();
    this.renderEmployeesPerCategoryChart();
    this.renderAdoptionRateChart();
    this.renderLevelDistributionChart();
  }

  private renderSkillsPerCategoryChart(): void {
    const canvas = this.skillsPerCategoryChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.skillsPerCategoryChartInstance?.destroy();

    const data = this.analytics()!.totalSkillsPerCategory.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(cat => cat.categoryName),
        datasets: [{
          label: 'Total Skills',
          data: data.map(cat => cat.skillCount),
          backgroundColor: '#4966c8',
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
        },
      },
    };

    this.skillsPerCategoryChartInstance = new Chart(canvas, config);
  }

  private renderEmployeesPerCategoryChart(): void {
    const canvas = this.employeesPerCategoryChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.employeesPerCategoryChartInstance?.destroy();

    const data = this.analytics()!.employeesPerCategory.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(cat => cat.categoryName),
        datasets: [{
          label: 'Employees Using',
          data: data.map(cat => cat.employeeCount),
          backgroundColor: '#20a36a',
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
        },
      },
    };

    this.employeesPerCategoryChartInstance = new Chart(canvas, config);
  }

  private renderAdoptionRateChart(): void {
    const canvas = this.adoptionRateChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.adoptionRateChartInstance?.destroy();

    const data = this.analytics()!.mostPopularCategories.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map(cat => cat.categoryName),
        datasets: [{
          data: data.map(cat => cat.popularity),
          backgroundColor: ['#4966c8', '#3157c7', '#20a36a', '#f0a33a', '#7545c2', '#16804f', '#ff6b6b', '#ff9ff3'],
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

    this.adoptionRateChartInstance = new Chart(canvas, config);
  }

  private renderLevelDistributionChart(): void {
    const canvas = this.levelDistributionChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.levelDistributionChartInstance?.destroy();

    const reports = this.analytics()!.categoryUsageReports;
    
    // Aggregate level breakdown across all categories
    const aggregated = reports.reduce((acc, cat) => {
      acc.expert += cat.levelBreakdown.expert;
      acc.advanced += cat.levelBreakdown.advanced;
      acc.intermediate += cat.levelBreakdown.intermediate;
      acc.beginner += cat.levelBreakdown.beginner;
      return acc;
    }, { expert: 0, advanced: 0, intermediate: 0, beginner: 0 });

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Expert', 'Advanced', 'Intermediate', 'Beginner'],
        datasets: [{
          data: [aggregated.expert, aggregated.advanced, aggregated.intermediate, aggregated.beginner],
          backgroundColor: ['#20a36a', '#4966c8', '#f0a33a', '#7545c2'],
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

    this.levelDistributionChartInstance = new Chart(canvas, config);
  }

  formatDate(month: number, year: number): string {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
