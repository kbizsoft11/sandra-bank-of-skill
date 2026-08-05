import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AssessmentService } from '../../core/services/assessment.service';
import { AssessmentReport } from '../../shared/interfaces/assessment.interface';

Chart.register(...registerables);
type ReportSection = Record<string, any>;

@Component({ selector: 'app-prism-report', standalone: true, imports: [CommonModule], templateUrl: './prism-report.html', styleUrl: './prism-report.scss' })
export class PrismReportComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentService = inject(AssessmentService);
  @ViewChild('behaviourChart') behaviourChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('aptitudeChart') aptitudeChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('eiChart') eiChart?: ElementRef<HTMLCanvasElement>;
  readonly loading = signal(true); readonly error = signal<string | null>(null); readonly report = signal<AssessmentReport | null>(null); readonly employeeName = signal('Employee');
  // Keep the collection structurally typed so Chart.js' specialised bar
  // chart generics do not conflict with the union used by Chart[].
  private charts: Array<{ destroy: () => void }> = [];

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('employeeId') || '';
    this.employeeName.set(this.route.snapshot.queryParamMap.get('name') || 'Employee');
    if (!employeeId) { this.loading.set(false); this.error.set('Employee report could not be identified.'); return; }
    this.assessmentService.getAssessmentReport(employeeId).pipe(take(1)).subscribe({
      next: (response) => { this.report.set(response.data); this.loading.set(false); setTimeout(() => this.renderCharts(), 0); },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.message || 'Unable to load the PRISM report.'); },
    });
  }
  ngAfterViewInit(): void { if (this.report()) this.renderCharts(); }
  ngOnDestroy(): void { this.charts.forEach((chart) => chart.destroy()); }
  get assessmentData(): ReportSection { return (this.report()?.reportData as any)?.assessmentData || {}; }
  get emotionalIntelligenceData(): ReportSection { return (this.report()?.reportData as any)?.emotionalIntelligenceData || {}; }
  get behaviourItems(): Array<{ name: string; score: number }> { return (this.assessmentData['dtBehData'] || []).map((item: any) => ({ name: String(item.value || '').split('|')[0] || 'Behaviour', score: Number(item.key) || 0 })); }
  get aptitudeItems(): Array<{ name: string; score: number }> { return (this.assessmentData['dtWAData'] || []).map((item: any) => ({ name: item.apt_title || 'Work aptitude', score: Number(item.score) || 0 })); }
  get eiItems(): Array<{ name: string; score: number }> { return [...(this.emotionalIntelligenceData['CDAItems'] || []), ...(this.emotionalIntelligenceData['EQItems'] || []), ...(this.emotionalIntelligenceData['MTItems'] || [])].filter((item: any) => item.item_title || item.itemTitle).map((item: any) => ({ name: item.item_title || item.itemTitle, score: Number(item.item_score ?? item.score) || 0 })); }
  get averageAptitude(): number { return this.average(this.aptitudeItems.map((item) => item.score)); }
  get averageEI(): number { return this.average(this.eiItems.map((item) => item.score)); }
  get topBehaviours(): Array<{ name: string; description: string }> { return (this.assessmentData['dtTopBehData'] || []).slice(0, 4).map((item: any) => ({ name: item.value || 'Behaviour', description: this.cleanHtml(item.key || '') })); }
  private average(values: number[]): number { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
  private cleanHtml(value: string): string { return value.replace(/<[^>]*>/g, '').replace(/&#8217;/g, "'"); }
  private renderCharts(): void { this.charts.forEach((chart) => chart.destroy()); this.charts = []; this.createChart(this.behaviourChart, this.behaviourItems, 'Behaviour profile', '#5669d9'); this.createChart(this.aptitudeChart, this.aptitudeItems, 'Work aptitude', '#e69a3a'); this.createChart(this.eiChart, this.eiItems.slice(0, 12), 'EI and mental toughness', '#35a77a'); }
  private createChart(target: ElementRef<HTMLCanvasElement> | undefined, items: Array<{ name: string; score: number }>, label: string, color: string): void {
    if (!target || !items.length) return;
    const config: ChartConfiguration<'bar'> = { type: 'bar', data: { labels: items.map((item) => item.name), datasets: [{ label, data: items.map((item) => item.score), backgroundColor: color, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { min: 0, max: 100, ticks: { stepSize: 20 } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } } };
    this.charts.push(new Chart(target.nativeElement, config));
  }
  goBack(): void { this.router.navigate([this.router.url.startsWith('/employee/') ? '/employee/dashboard' : '/company/dashboard']); }
}
