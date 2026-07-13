import {
    Component,
    inject,
    signal,
    OnInit,
    computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { 
    Questionnaire, 
    QuestionnaireResponseWithEmployee,
    Question 
} from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-questionnaire-responses',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './questionnaire-responses.html',
    styleUrl: './questionnaire-responses.scss'
})
export class QuestionnaireResponses implements OnInit {

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isLoading = signal<boolean>(true);
    readonly questionnaireId = signal<string>('');
    readonly questionnaire = signal<Questionnaire | null>(null);
    readonly responses = signal<QuestionnaireResponseWithEmployee[]>([]);
    readonly selectedResponse = signal<QuestionnaireResponseWithEmployee | null>(null);
    readonly searchTerm = signal<string>('');
    readonly statusFilter = signal<string>('all');

    // Statistics
    readonly stats = computed(() => {
        const allResponses = this.responses();
        return {
            total: allResponses.length,
            completed: allResponses.filter(r => r.status === 'completed').length,
            inProgress: allResponses.filter(r => r.status === 'in_progress').length,
            pending: allResponses.filter(r => r.status === 'pending').length
        };
    });

    // Filtered responses
    readonly filteredResponses = computed(() => {
        let filtered = this.responses();
        
        const search = this.searchTerm().toLowerCase();
        if (search) {
            filtered = filtered.filter(r => 
                r.employee?.fullName.toLowerCase().includes(search) ||
                r.employee?.email.toLowerCase().includes(search) ||
                r.employee?.department?.toLowerCase().includes(search)
            );
        }
        
        const status = this.statusFilter();
        if (status !== 'all') {
            filtered = filtered.filter(r => r.status === status);
        }
        
        return filtered;
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.questionnaireId.set(id);
            this.loadResponses(id);
        } else {
            this.alertService.error('Invalid questionnaire ID');
            this.cancel();
        }
    }

    loadResponses(id: string): void {
        this.isLoading.set(true);
        
        this.questionnaireService.getQuestionnaireResponses(id).subscribe({
            next: (response) => {
                this.questionnaire.set(response.data.questionnaire);
                this.responses.set(response.data.responses);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Failed to load responses');
                this.isLoading.set(false);
                this.cancel();
            }
        });
    }

    onSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTerm.set(value);
    }

    onStatusFilterChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.statusFilter.set(value);
    }

    viewResponse(response: QuestionnaireResponseWithEmployee): void {
        this.selectedResponse.set(response);
    }

    closeResponseModal(): void {
        this.selectedResponse.set(null);
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
                return 'Pending';
            default:
                return status;
        }
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getAnswerForQuestion(response: QuestionnaireResponseWithEmployee, questionId: string): string {
        const answer = response.answers.find(a => a.questionId === questionId);
        if (!answer) return 'No answer';
        
        if (Array.isArray(answer.answer)) {
            return answer.answer.join(', ');
        }
        return answer.answer.toString();
    }

    getQuestion(questionId: string): Question | undefined {
        return this.questionnaire()?.questions.find(q => q.questionId === questionId);
    }

    cancel(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires`]);
    }

    getCompletionPercentage(): number {
        const total = this.stats().total;
        if (total === 0) return 0;
        return Math.round((this.stats().completed / total) * 100);
    }
}
