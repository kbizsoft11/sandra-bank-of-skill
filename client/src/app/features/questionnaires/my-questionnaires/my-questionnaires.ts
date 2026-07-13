import {
    Component,
    inject,
    signal,
    OnInit,
    computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { QuestionnaireWithResponse } from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-my-questionnaires',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './my-questionnaires.html',
    styleUrl: './my-questionnaires.scss'
})
export class MyQuestionnaires implements OnInit {

    private questionnaireService = inject(QuestionnaireService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);

    readonly questionnaires = signal<QuestionnaireWithResponse[]>([]);
    readonly isLoading = signal<boolean>(true);
    readonly statusFilter = signal<string>('all');

    // Statistics
    readonly stats = computed(() => {
        const all = this.questionnaires();
        return {
            total: all.length,
            completed: all.filter(q => q.responseStatus === 'completed').length,
            inProgress: all.filter(q => q.responseStatus === 'in_progress').length,
            pending: all.filter(q => q.responseStatus === 'pending').length
        };
    });

    // Filtered questionnaires based on status
    readonly filteredQuestionnaires = computed(() => {
        const status = this.statusFilter();
        if (status === 'all') {
            return this.questionnaires();
        }
        return this.questionnaires().filter(q => q.responseStatus === status);
    });

    ngOnInit(): void {
        this.loadQuestionnaires();
    }

    loadQuestionnaires(): void {
        this.isLoading.set(true);
        
        this.questionnaireService
            .getMyQuestionnaires()
            .subscribe({
                next: (response) => {
                    const questionnaires = Array.isArray(response?.data)
                        ? response.data
                        : [];
                    
                    this.questionnaires.set(questionnaires);
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error(err);
                    this.alertService.error('Failed to load questionnaires');
                    this.isLoading.set(false);
                }
            });
    }

    onStatusFilterChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.statusFilter.set(value);
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'completed':
                return 'badge bg-success';
            case 'in_progress':
                return 'badge bg-warning';
            case 'pending':
                return 'badge bg-secondary';
            default:
                return 'badge bg-secondary';
        }
    }

    getStatusText(status: string): string {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'in_progress':
                return 'In Progress';
            case 'pending':
                return 'Not Started';
            default:
                return status;
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'completed':
                return 'bi-check-circle-fill';
            case 'in_progress':
                return 'bi-clock-fill';
            case 'pending':
                return 'bi-hourglass-split';
            default:
                return 'bi-question-circle';
        }
    }

    startQuestionnaire(questionnaire: QuestionnaireWithResponse): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires/${questionnaire._id}/submit`]);
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'Overdue';
        } else if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else if (diffDays <= 7) {
            return `Due in ${diffDays} days`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    getDeadlineClass(dateString?: string): string {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'text-danger';
        } else if (diffDays <= 3) {
            return 'text-warning';
        }
        return '';
    }

    isOverdue(dateString?: string): boolean {
        if (!dateString) return false;
        const date = new Date(dateString);
        const now = new Date();
        return date.getTime() < now.getTime();
    }
}
