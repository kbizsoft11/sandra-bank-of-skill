import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ getPageTitle() }}</h1>
          <p class="page-subtitle">This feature is coming soon!</p>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <i class="bi bi-hourglass-split" style="font-size: 3rem; color: #cbd5e1;"></i>
            <h3>Coming Soon</h3>
            <p>This feature is under development and will be available soon.</p>
            <button class="btn btn-primary" (click)="goToDashboard()">
              <i class="bi bi-grid-1x2"></i> Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
    .page-header {
      margin-bottom: 2rem;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0;
      text-transform: capitalize;
    }
    .page-subtitle {
      color: #64748b;
      margin: 0.25rem 0 0 0;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }
    .empty-state i {
      display: block;
      margin-bottom: 1rem;
    }
    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      color: #64748b;
      margin-bottom: 2rem;
    }
  `]
})
export class PlaceholderComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  getPageTitle(): string {
    const url = this.router.url;
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    return lastSegment.replace(/-/g, ' ');
  }

  goToDashboard(): void {
    const dashboardPath = this.auth.getRoleDashboardPath();
    this.router.navigate([dashboardPath]);
  }
}
