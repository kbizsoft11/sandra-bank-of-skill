import {
    Component,
    computed,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TableActions } from '../../../shared/components/table-actions/table-actions';
import { Questionnaire } from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-questionnaire-list',
    standalone: true,
    imports: [
        CommonModule,
        TableActions
    ],
    templateUrl: './questionnaire-list.html',
    styleUrl: './questionnaire-list.scss',
})
export class QuestionnaireList implements OnInit {

    private questionnaireService = inject(QuestionnaireService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);

    readonly questionnaires = signal<Questionnaire[]>([]);
    readonly isLoading = signal<boolean>(true);
    readonly searchTerm = signal<string>('');
    readonly statusFilter = signal<string>('all');

    // Filtered questionnaires based on search and status
    readonly filteredQuestionnaires = computed(() => {
        let filtered = this.questionnaires();
        
        const search = this.searchTerm().toLowerCase();
        if (search) {
            filtered = filtered.filter(q => 
                q.title.toLowerCase().includes(search) ||
                q.description.toLowerCase().includes(search)
            );
        }
        
        const status = this.statusFilter();
        if (status !== 'all') {
            filtered = filtered.filter(q => q.status === status);
        }
        
        return filtered;
    });

    ngOnInit(): void {
        this.loadQuestionnaires();
    }

    loadQuestionnaires(): void {
        this.isLoading.set(true);
        
        this.questionnaireService
            .getAllQuestionnaires()
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

    onSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTerm.set(value);
    }

    onStatusFilterChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.statusFilter.set(value);
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'draft':
                return 'badge bg-secondary';
            case 'active':
                return 'badge bg-success';
            case 'archived':
                return 'badge bg-warning';
            default:
                return 'badge bg-secondary';
        }
    }

    getStatusText(status: string): string {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    createQuestionnaire(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires/create`]);
    }

    viewQuestionnaire(questionnaire: Questionnaire): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires/${questionnaire._id}/responses`]);
    }

    editQuestionnaire(questionnaire: Questionnaire): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires/${questionnaire._id}/edit`]);
    }

    assignQuestionnaire(questionnaire: Questionnaire): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires/${questionnaire._id}/assign`]);
    }

    deleteQuestionnaire(questionnaire: Questionnaire): void {
        this.alertService.confirmDelete(questionnaire.title).then((confirmed) => {
            if (confirmed) {
                this.questionnaireService.deleteQuestionnaire(questionnaire._id).subscribe({
                    next: () => {
                        this.loadQuestionnaires();
                        this.alertService.toast('Questionnaire deleted successfully', 'success');
                    },
                    error: (err) => {
                        console.error(err);
                        this.alertService.error('Failed to delete questionnaire. Please try again.');
                    }
                });
            }
        });
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}
