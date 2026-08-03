import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, CompanyAnalytics } from '../../core/services/analytics.service';
import { ExportService } from '../../core/services/export.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-company-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-analytics.html',
  styleUrls: ['./company-analytics.scss'],
})
export class CompanyAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly exportService = inject(ExportService);

  @ViewChild('companyStatusChart') companyStatusChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthTrendChart') growthTrendChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeesPerCompanyChart') employeesPerCompanyChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('skillAssignmentsChart') skillAssignmentsChart?: ElementRef<HTMLCanvasElement>;

  private companyStatusChartInstance: Chart | null = null;
  private growthTrendChartInstance: Chart | null = null;
  private employeesPerCompanyChartInstance: Chart | null = null;
  private skillAssignmentsChartInstance: Chart | null = null;

  readonly analytics = signal<CompanyAnalytics | null>(null);
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

  isCompanyActive(status: any): boolean {
    if (status === true || status === 'true' || status === 'Active') {
      return true;
    }
    return false;
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadAnalytics(startDate?: string, endDate?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getCompanyAnalytics(startDate, endDate).subscribe({
      next: (response) => {
        if (response?.data) {
          this.analytics.set(response.data);
          setTimeout(() => this.renderCharts(), 100);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.error.set('Failed to load company analytics');
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
        data.usageReport.map(company => ({
          'Company Name': company.name,
          'Status': company.status ? 'Active' : 'Inactive',
          'Total Employees': company.totalEmployees,
          'Active Employees': company.activeEmployees,
          'Skill Assignments': company.totalSkillAssignments,
          'Days Active': company.daysActive,
          'Registration Date': new Date(company.registrationDate).toLocaleDateString(),
        })),
        []
      );

      const filename = `Company-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToCSV(
        exportData,
        filename,
        [
          'Company Name',
          'Status',
          'Total Employees',
          'Active Employees',
          'Skill Assignments',
          'Days Active',
          'Registration Date',
        ]
      );

      console.log('Company analytics exported successfully');
    } catch (error) {
      console.error('Error exporting company analytics:', error);
      this.error.set('Failed to export company analytics');
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
        data.usageReport.map(company => ({
          'Company Name': company.name,
          'Status': company.status ? 'Active' : 'Inactive',
          'Total Employees': company.totalEmployees,
          'Active Employees': company.activeEmployees,
          'Skill Assignments': company.totalSkillAssignments,
          'Days Active': company.daysActive,
          'Registration Date': new Date(company.registrationDate).toLocaleDateString(),
        })),
        []
      );

      const filename = `Company-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToExcel(
        exportData,
        filename,
        [
          'Company Name',
          'Status',
          'Total Employees',
          'Active Employees',
          'Skill Assignments',
          'Days Active',
          'Registration Date',
        ]
      );

      console.log('Company analytics exported successfully');
    } catch (error) {
      console.error('Error exporting company analytics:', error);
      this.error.set('Failed to export company analytics');
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
    this.companyStatusChartInstance?.destroy();
    this.growthTrendChartInstance?.destroy();
    this.employeesPerCompanyChartInstance?.destroy();
    this.skillAssignmentsChartInstance?.destroy();
    this.companyStatusChartInstance = null;
    this.growthTrendChartInstance = null;
    this.employeesPerCompanyChartInstance = null;
    this.skillAssignmentsChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined' || !this.analytics()) return;

    this.renderCompanyStatusChart();
    this.renderGrowthTrendChart();
    this.renderEmployeesPerCompanyChart();
    this.renderSkillAssignmentsChart();
  }

  private renderCompanyStatusChart(): void {
    const canvas = this.companyStatusChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.companyStatusChartInstance?.destroy();

    const data = this.analytics()!;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Inactive'],
        datasets: [
          {
            data: [data.activeCompanies, data.inactiveCompanies],
            backgroundColor: ['#20a36a', '#dc3545'],
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

    this.companyStatusChartInstance = new Chart(canvas, config);
  }

  private renderGrowthTrendChart(): void {
    const canvas = this.growthTrendChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.growthTrendChartInstance?.destroy();

    const data = this.analytics()!.growthReport
      .sort((a, b) => {
        if (a._id.year !== b._id.year) return a._id.year - b._id.year;
        return a._id.month - b._id.month;
      })
      .slice(0, 12);

    const labels = data.map(item => {
      const date = new Date(item._id.year, item._id.month - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Registrations',
            data: data.map(item => item.count),
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
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };

    this.growthTrendChartInstance = new Chart(canvas, config);
  }

  private renderEmployeesPerCompanyChart(): void {
    const canvas = this.employeesPerCompanyChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.employeesPerCompanyChartInstance?.destroy();

    // Use usageReport for employee count data - get top 10
    const data = this.analytics()!.usageReport.slice(0, 10);

    if (!data || data.length === 0) {
      console.log('No data available for employees per company chart');
      return;
    }

    // Truncate company names for readability
    const labels = data.map(company => {
      const name = company.name || 'Unknown';
      return name.length > 25 ? name.substring(0, 22) + '...' : name;
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Employees',
            data: data.map(company => company.totalEmployees || 0),
            backgroundColor: '#4966c8',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };

    this.employeesPerCompanyChartInstance = new Chart(canvas, config);
  }

  private renderSkillAssignmentsChart(): void {
    const canvas = this.skillAssignmentsChart?.nativeElement;
    if (!canvas || !this.analytics()) return;

    this.skillAssignmentsChartInstance?.destroy();

    // Use topSkillCategories for the chart data
    const data = this.analytics()!.topSkillCategories || [];

    if (!data || data.length === 0) {
      console.log('No skill category data available');
      return;
    }

    // Get top 8 categories
    const chartData = data.slice(0, 8);

    // Color palette for different categories
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: chartData.map((item: any) => item.categoryName || 'Unknown'),
        datasets: [
          {
            label: 'Companies Using',
            data: chartData.map((item: any) => item.companiesCount || 0),
            backgroundColor: colors.slice(0, chartData.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };

    this.skillAssignmentsChartInstance = new Chart(canvas, config);
  }
}
