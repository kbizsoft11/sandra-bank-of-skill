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

interface PendingQuestion {
    _id: string;
    questionId: string;
    questionText: string;
    questionType: string;
    skillDescription?: string;
    options?: string[];
    required: boolean;
    order: number;
    status: string;
}

interface QuestionnaireData {
    _id: string;
    title: string;
    description: string;
    isOnboarding: boolean;
}

interface Progress {
    total: number;
    answered: number;
    pending: number;
    percentComplete: number;
}

@Component({
    selector: 'app-my-questionnaires',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './my-questionnaires.html',
    styleUrl: './my-questionnaires.scss'
})
export class MyQuestionnaires implements OnInit {

    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);

    // State
    readonly isLoading = signal<boolean>(true);
    readonly isSaving = signal<boolean>(false);
    readonly responseId = signal<string>('');
    readonly questionnaire = signal<QuestionnaireData | null>(null);
    readonly pendingQuestions = signal<PendingQuestion[]>([]);
    readonly currentQuestion = computed(() => this.pendingQuestions()[0] || null);
    readonly progress = signal<Progress>({ total: 0, answered: 0, pending: 0, percentComplete: 0 });
    
    // Answer state
    readonly selectedSkillLevel = signal<number | null>(null);
    readonly selectedInterestLevel = signal<number | null>(null);
    readonly showAnsweredAnimation = signal<boolean>(false);
    
    // Track the last saved question to prevent duplicate saves
    private lastSavedQuestionId: string | null = null;
    private loadingQuestionnaires = false;
    private startingQuestionnaire = false;

    // Rating options
    readonly skillLevelOptions = [
        { value: 5, label: 'Highly Skilled' },
        { value: 4, label: 'Developed Skills' },
        { value: 3, label: 'Competent' },
        { value: 2, label: 'Basic Capability' },
        { value: 1, label: 'Very Low' },
        { value: 0, label: 'N/A' },
    ];

    readonly interestLevelOptions = [
        { value: 5, label: 'Highly Interested' },
        { value: 4, label: 'Interested' },
        { value: 3, label: 'Neutral' },
        { value: 2, label: 'Low Interest' },
        { value: 1, label: 'Very Low' },
        { value: 0, label: 'N/A' },
    ];

    ngOnInit(): void {
        this.loadQuestionnaire();
    }

    loadQuestionnaire(): void {
        // Prevent duplicate calls
        if (this.loadingQuestionnaires) {
            return;
        }
        
        this.loadingQuestionnaires = true;
        this.isLoading.set(true);

        // First, get assigned questionnaires
        this.questionnaireService.getAssignedQuestionnaires().subscribe({
            next: (response) => {
                if (!response.success || !response.data || response.data.length === 0) {
                    this.alertService.info('No questionnaires assigned');
                    this.isLoading.set(false);
                    this.loadingQuestionnaires = false;
                    this.router.navigate(['/employee/dashboard']);
                    return;
                }

                // Find first incomplete questionnaire
                const incomplete = response.data.find((q: any) => q.status !== 'completed');
                
                if (!incomplete) {
                    this.alertService.success('All questionnaires completed!');
                    this.isLoading.set(false);
                    this.loadingQuestionnaires = false;
                    this.router.navigate(['/employee/dashboard']);
                    return;
                }

                this.responseId.set(incomplete.responseId);
                this.startQuestionnaire(incomplete.responseId);
            },
            error: (err) => {
                console.error('Error loading questionnaires:', err);
                this.alertService.error('Failed to load questionnaires');
                this.isLoading.set(false);
                this.loadingQuestionnaires = false;
            }
        });
    }

    startQuestionnaire(responseId: string): void {
        // Prevent duplicate starts
        if (this.startingQuestionnaire) {
            return;
        }
        
        this.startingQuestionnaire = true;
        
        this.questionnaireService.startQuestionnaire(responseId).subscribe({
            next: (response) => {
                if (!response.success) {
                    this.alertService.error('Failed to start questionnaire');
                    this.isLoading.set(false);
                    this.loadingQuestionnaires = false;
                    this.startingQuestionnaire = false;
                    return;
                }

                const data = response.data;
                this.questionnaire.set(data.questionnaire);
                this.pendingQuestions.set(data.pendingQuestions || []);
                this.progress.set(data.progress);
                this.isLoading.set(false);
                this.loadingQuestionnaires = false;
                this.startingQuestionnaire = false;

                // Reset answer state
                this.selectedSkillLevel.set(null);
                this.selectedInterestLevel.set(null);

                if (this.pendingQuestions().length === 0) {
                    this.handleQuestionnireComplete();
                }
            },
            error: (err) => {
                console.error('Error starting questionnaire:', err);
                this.alertService.error('Failed to start questionnaire');
                this.isLoading.set(false);
                this.loadingQuestionnaires = false;
                this.startingQuestionnaire = false;
            }
        });
    }

    selectSkillLevel(value: number): void {
        if (this.isSaving()) return;
        
        this.selectedSkillLevel.set(value);
        this.checkAndSaveAnswer();
    }

    selectInterestLevel(value: number): void {
        if (this.isSaving()) return;
        
        this.selectedInterestLevel.set(value);
        this.checkAndSaveAnswer();
    }

    checkAndSaveAnswer(): void {
        const skillLevel = this.selectedSkillLevel();
        const interestLevel = this.selectedInterestLevel();
        const currentQ = this.currentQuestion();

        // Only save when both levels are selected
        if (skillLevel !== null && interestLevel !== null && currentQ) {
            this.saveAnswer(currentQ.questionId, {
                skillLevel: skillLevel === 0 ? null : skillLevel,
                interestLevel: interestLevel === 0 ? null : interestLevel,
            });
        }
    }

    saveAnswer(questionId: string, answerData: any): void {
        // Prevent duplicate saves for the same question
        if (this.isSaving() || this.lastSavedQuestionId === questionId) {
            return;
        }

        this.lastSavedQuestionId = questionId;
        this.isSaving.set(true);
        const responseId = this.responseId();

        this.questionnaireService.saveQuestionAnswer(responseId, questionId, answerData).subscribe({
            next: (response) => {
                if (!response.success) {
                    this.alertService.error('Failed to save answer');
                    this.isSaving.set(false);
                    this.lastSavedQuestionId = null;
                    return;
                }

                // Update progress
                this.progress.set(response.data.progress);

                // Show animation
                this.showAnsweredAnimation.set(true);

                // Remove answered question after animation
                setTimeout(() => {
                    const pending = this.pendingQuestions();
                    const updated = pending.filter(q => q.questionId !== questionId);
                    this.pendingQuestions.set(updated);

                    // Reset answer state for next question
                    this.selectedSkillLevel.set(null);
                    this.selectedInterestLevel.set(null);
                    this.showAnsweredAnimation.set(false);
                    this.isSaving.set(false);
                    this.lastSavedQuestionId = null;

                    // Check if all done
                    if (updated.length === 0) {
                        this.handleQuestionnireComplete();
                    }
                }, 600); // Match animation duration
            },
            error: (err) => {
                console.error('Error saving answer:', err);
                const errorMessage = err.error?.message || 'Failed to save answer. Please try again.';
                this.alertService.error(errorMessage);
                this.isSaving.set(false);
                this.lastSavedQuestionId = null;
            }
        });
    }

    handleQuestionnireComplete(): void {
        this.alertService.success('🎉 Questionnaire completed successfully!');
        
        setTimeout(() => {
            this.router.navigate(['/employee/dashboard']);
        }, 1500);
    }

    getUserInitials(): string {
        const user = this.auth.user();
        const fullName = (user as any)?.fullName || 'User';
        const names = fullName.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.substring(0, 2).toUpperCase();
    }

    getUserFirstName(): string {
        const user = this.auth.user();
        const fullName = (user as any)?.fullName || 'there';
        return fullName.split(' ')[0];
    }
}