import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, EmployeeAnalytics } from '../../core/services/analytics.service';
import { ExportService } from '../../core/services/export.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-employee-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-analytics.html',
  styleUrls: ['./employee-analytics.scss'],
})
export class EmployeeAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly exportService = inject(ExportService);

  @ViewChild('employeeStatusChart') employeeStatusChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthTrendChart') growthTrendChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('departmentChart') departmentChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeesByCompanyChart') employeesByCompanyChart?: ElementRef<HTMLCanvasElement>;

  private employeeStatusChartInstance: Chart | null = null;
  private growthTrendChartInstance: Chart | null = null;
  private departmentChartInstance: Chart | null = null;
  private employeesByCompanyChartInstance: Chart | null = null;

  readonly analytics = signal<EmployeeAnalytics | null>(null);
  readonly filteredAnalytics = signal<EmployeeAnalytics | null>(null);
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

    this.analyticsService.getEmployeeAnalytics(startDate, endDate).subscribe({
      next: (response) => {
        if (response?.data) {
          this.analytics.set(response.data);
          this.filteredAnalytics.set(response.data);
          setTimeout(() => this.renderCharts(), 100);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.error.set('Failed to load employee analytics');
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
      const exportData = this.exportService.flattenData(
        data.employeeActivityReport.map(company => ({
          'Company': company.companyName,
          'Total Employees': company.totalEmployees,
          'Active Employees': company.activeEmployees,
          'Inactive Employees': company.inactiveEmployees,
          'Avg Days Active': Math.round(company.avgDaysActive),
        })),
        []
      );

      const filename = `Employee-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToCSV(
        exportData,
        filename,
        ['Company', 'Total Employees', 'Active Employees', 'Inactive Employees', 'Avg Days Active']
      );

      console.log('Employee analytics exported successfully');
    } catch (error) {
      console.error('Error exporting employee analytics:', error);
      this.error.set('Failed to export employee analytics');
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
      const exportData = this.exportService.flattenData(
        data.employeeActivityReport.map(company => ({
          'Company': company.companyName,
          'Total Employees': company.totalEmployees,
          'Active Employees': company.activeEmployees,
          'Inactive Employees': company.inactiveEmployees,
          'Avg Days Active': Math.round(company.avgDaysActive),
        })),
        []
      );

      const filename = `Employee-Analytics-${this.getFormattedDate()}`;
      this.exportService.exportToExcel(
        exportData,
        filename,
        ['Company', 'Total Employees', 'Active Employees', 'Inactive Employees', 'Avg Days Active']
      );

      console.log('Employee analytics exported successfully');
    } catch (error) {
      console.error('Error exporting employee analytics:', error);
      this.error.set('Failed to export employee analytics');
    } finally {
      this.exporting.set(false);
    }
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

  isEmployeeActive(status: any): boolean {
    if (status === true || status === 'true' || status === 'Active') {
      return true;
    }
    return false;
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

  private destroyCharts(): void {
    this.employeeStatusChartInstance?.destroy();
    this.growthTrendChartInstance?.destroy();
    this.departmentChartInstance?.destroy();
    this.employeesByCompanyChartInstance?.destroy();
    this.employeeStatusChartInstance = null;
    this.growthTrendChartInstance = null;
    this.departmentChartInstance = null;
    this.employeesByCompanyChartInstance = null;
  }

  private renderCharts(): void {
    if (typeof window === 'undefined' || !this.analytics()) return;

    this.renderEmployeeStatusChart();
    this.renderGrowthTrendChart();
    this.renderDepartmentChart();
    this.renderEmployeesByCompanyChart();
  }

  private renderEmployeeStatusChart(): void {
    const canvas = this.employeeStatusChart?.nativeElement;
    if (!canvas || !this.filteredAnalytics()) return;

    this.employeeStatusChartInstance?.destroy();

    const data = this.filteredAnalytics()!;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Inactive'],
        datasets: [
          {
            data: [data.activeEmployees, data.inactiveEmployees],
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

    this.employeeStatusChartInstance = new Chart(canvas, config);
  }

  private renderGrowthTrendChart(): void {
    const canvas = this.growthTrendChart?.nativeElement;
    if (!canvas || !this.filteredAnalytics()) return;

    this.growthTrendChartInstance?.destroy();

    const data = this.filteredAnalytics()!.employeeGrowthReport
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
            label: 'New Employees',
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

  private renderDepartmentChart(): void {
    const canvas = this.departmentChart?.nativeElement;
    if (!canvas || !this.filteredAnalytics()) return;

    this.departmentChartInstance?.destroy();

    const data = this.filteredAnalytics()!.topDepartments.slice(0, 10);

    if (!data || data.length === 0) {
      console.log('No department data available');
      return;
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map((dept: any) => dept._id || 'Unknown'),
        datasets: [
          {
            label: 'Total Employees',
            data: data.map((dept: any) => dept.totalEmployees || 0),
            backgroundColor: '#4966c8',
            borderRadius: 6,
          },
          {
            label: 'Active',
            data: data.map((dept: any) => dept.activeEmployees || 0),
            backgroundColor: '#20a36a',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: true, labels: { usePointStyle: true } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };

    this.departmentChartInstance = new Chart(canvas, config);
  }

  private renderEmployeesByCompanyChart(): void {
    const canvas = this.employeesByCompanyChart?.nativeElement;
    if (!canvas || !this.filteredAnalytics()) return;

    this.employeesByCompanyChartInstance?.destroy();

    const data = this.filteredAnalytics()!.employeesByCompany.slice(0, 10);

    console.log('Employees by Company Data:', data);

    if (!data || data.length === 0) {
      console.log('No company data available');
      return;
    }

    const labels = data.map(company => company.companyName || 'Unknown');
    const totalData = data.map(company => company.totalCount || 0);
    const activeData = data.map(company => company.activeCount || 0);

    console.log('Chart Labels:', labels);
    console.log('Total Data:', totalData);
    console.log('Active Data:', activeData);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total',
            data: totalData,
            backgroundColor: '#4966c8',
            borderRadius: 6,
          },
          {
            label: 'Active',
            data: activeData,
            backgroundColor: '#20a36a',
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { usePointStyle: true } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };

    this.employeesByCompanyChartInstance = new Chart(canvas, config);
  }
}
