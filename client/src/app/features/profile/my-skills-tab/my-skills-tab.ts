import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillUserService } from '../../../core/services/skill-user.service';
import { AlertService } from '../../../core/services/alert.service';
import { SkillUser } from '../../../shared/interfaces/skill-user.interface';

@Component({
  selector: 'app-my-skills-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skills-tab-container">
      <!-- Header -->
      <div class="skills-header mb-4">
        <h3 class="h5 fw-bold mb-3">
          <i class="bi bi-star-fill me-2"></i>My Skills
        </h3>
        <p class="text-muted mb-0">
          Skills from questionnaires, assessments, and company assignments
        </p>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading your skills...</p>
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle-fill me-2"></i>
          {{ error() }}
          <button type="button" class="btn-close" (click)="error.set('')"></button>
        </div>
      } @else if (skills().length === 0) {
        <!-- Empty State -->
        <div class="empty-state text-center py-5">
          <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
          <p class="mt-3 text-muted">No skills found</p>
          <p class="small text-muted">
            Complete questionnaires or complete assessments to see your skills here
          </p>
        </div>
      } @else {
        <!-- Skills Grid -->
        <div class="skills-grid">
          <div class="row">
            @for (skill of skills(); track skill._id) {
              <div class="col-12 col-sm-6 col-lg-4 mb-3">
                <div class="skill-card h-100">
                  <!-- Skill Header -->
                  <div class="skill-card__header">
                    <h6 class="skill-name">{{ skill.skill?.name }}</h6>
                    <span class="badge" [ngClass]="getLevelBadgeClass(skill.level)">
                      {{ skill.level }}
                    </span>
                  </div>

                  <!-- Skill Description -->
                  <p class="skill-description">
                    {{ skill.skill?.description || 'No description' }}
                  </p>

                  <!-- Score Bar -->
                  <div class="skill-score-container mb-3">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="small fw-semibold">Proficiency</span>
                      <span class="small fw-semibold">{{ skill.score }}%</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                      <div
                        class="progress-bar"
                        [ngClass]="getScoreBarClass(skill.score)"
                        [style.width.%]="skill.score"
                        role="progressbar"
                        [attr.aria-valuenow]="skill.score"
                        aria-valuemin="0"
                        aria-valuemax="100">
                      </div>
                    </div>
                  </div>

                  <!-- Metadata -->
                  <div class="skill-metadata">
                    @if (skill.skill?.createdType) {
                      <div class="metadata-item">
                        <small class="text-muted">Type:</small>
                        <span class="badge" [ngClass]="getTypeBadgeClass(skill.skill.createdType)">
                          {{ skill.skill.createdType === 'ADMIN' ? '🔒 Admin' : '🏢 Company' }}
                        </span>
                      </div>
                    }

                    @if (skill.lastAssessedAt) {
                      <div class="metadata-item">
                        <small class="text-muted">Last Assessed:</small>
                        <span class="badge bg-light text-dark">
                          {{ formatDate(skill.lastAssessedAt) }}
                        </span>
                      </div>
                    }

                    @if (skill.questionnaireId) {
                      <div class="metadata-item">
                        <small class="text-muted">Source:</small>
                        <span class="badge bg-info">Questionnaire</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="skills-summary mt-5 pt-4 border-top">
          <div class="row text-center">
            <div class="col-md-3">
              <h5 class="text-primary fw-bold">{{ skills().length }}</h5>
              <small class="text-muted">Total Skills</small>
            </div>
            <div class="col-md-3">
              <h5 class="text-success fw-bold">{{ getExpertCount() }}</h5>
              <small class="text-muted">Expert Level</small>
            </div>
            <div class="col-md-3">
              <h5 class="text-warning fw-bold">{{ getAverageScore() }}%</h5>
              <small class="text-muted">Average Score</small>
            </div>
            <div class="col-md-3">
              <h5 class="text-info fw-bold">{{ getRecentCount() }}</h5>
              <small class="text-muted">Last 30 Days</small>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skills-tab-container {
      padding: 1.5rem 0;
    }

    .skills-header {
      h3 {
        margin-bottom: 0.5rem;
      }

      p {
        margin-bottom: 0;
      }
    }

    .empty-state {
      background-color: #f8f9fa;
      border-radius: 0.5rem;
      border: 1px dashed #dee2e6;
    }

    .skills-grid {
      margin-bottom: 2rem;
    }

    .skill-card {
      border: 1px solid #dee2e6;
      border-radius: 0.5rem;
      padding: 1.25rem;
      transition: all 0.3s ease;
      background: white;

      &:hover {
        box-shadow: 0 0.125rem 0.75rem rgba(0, 0, 0, 0.08);
        border-color: #0d6efd;
      }

      &__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 0.5rem;

        .skill-name {
          margin: 0;
          font-weight: 600;
          color: #212529;
          flex: 1;
        }

        .badge {
          white-space: nowrap;
          flex-shrink: 0;
        }
      }

      .skill-description {
        font-size: 0.875rem;
        color: #6c757d;
        margin-bottom: 1rem;
        line-height: 1.4;
      }

      .skill-score-container {
        .progress {
          background-color: #e9ecef;
        }
      }

      .skill-metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          small {
            font-size: 0.75rem;
            display: block;
          }

          .badge {
            font-size: 0.75rem;
            padding: 0.35rem 0.6rem;
          }
        }
      }
    }

    .skills-summary {
      background-color: #f8f9fa;
      border-radius: 0.5rem;
      padding: 1.5rem;

      h5 {
        margin-bottom: 0.25rem;
        font-size: 1.5rem;
      }

      small {
        font-size: 0.875rem;
      }
    }
  `]
})
export class MySkillsTabComponent implements OnInit {
  @Input() userId!: string;

  private readonly skillUserService = inject(SkillUserService);
  private readonly alertService = inject(AlertService);

  readonly skills = signal<SkillUser[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string>('');

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    if (!this.userId) {
      this.error.set('User ID not provided');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.skillUserService.getInEnabledCategories(this.userId).subscribe({
      next: (response) => {
        this.skills.set(response.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load skills:', err);
        this.error.set('Failed to load your skills. Please try again later.');
        this.isLoading.set(false);
      }
    });
  }

  getLevelBadgeClass(level: string): string {
    const classes: { [key: string]: string } = {
      'Beginner': 'bg-info',
      'Intermediate': 'bg-warning text-dark',
      'Advanced': 'bg-success',
      'Expert': 'bg-danger'
    };
    return classes[level] || 'bg-secondary';
  }

  getScoreBarClass(score: number): string {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-info';
    if (score >= 40) return 'bg-warning';
    return 'bg-danger';
  }

  getTypeBadgeClass(createdType: string): string {
    return createdType === 'ADMIN'
      ? 'bg-primary-subtle text-primary-emphasis'
      : 'bg-info-subtle text-info-emphasis';
  }

  getExpertCount(): number {
    return this.skills().filter(s => s.level === 'Expert').length;
  }

  getAverageScore(): number {
    const skills = this.skills();
    if (skills.length === 0) return 0;
    const total = skills.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / skills.length);
  }

  getRecentCount(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.skills().filter(skill => {
      const assessedDate = new Date(skill.lastAssessedAt);
      return assessedDate >= thirtyDaysAgo;
    }).length;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
