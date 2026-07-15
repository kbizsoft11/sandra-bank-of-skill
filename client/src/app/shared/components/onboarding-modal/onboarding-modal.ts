import {
    Component,
    inject,
    signal,
    OnInit,
    output
} from '@angular/core';

import {
    FormBuilder,
    FormControl,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { 
    Questionnaire, 
    Question
} from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-onboarding-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './onboarding-modal.html',
    styleUrl: './onboarding-modal.scss'
})
export class OnboardingModal implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    // Outputs
    readonly onComplete = output<void>();

    readonly isLoading = signal<boolean>(true);
    readonly isSubmitting = signal<boolean>(false);
    readonly questionnaire = signal<Questionnaire | null>(null);
    readonly responseId = signal<string>('');
    readonly currentQuestionIndex = signal<number>(0);
    readonly answers = signal<Map<string, any>>(new Map());

    currentControl: FormControl | null = null;

    ngOnInit(): void {
        this.loadPendingOnboarding();
    }

    loadPendingOnboarding(): void {
        this.isLoading.set(true);
        
        this.questionnaireService.getPendingOnboarding().subscribe({
            next: (response) => {
                console.log('📋 [ONBOARDING MODAL] getPendingOnboarding response:', response);
                if (response.data?.hasOnboarding && response.data?.questionnaire && response.data?.response) {
                    this.questionnaire.set(response.data.questionnaire);
                    this.responseId.set(response.data.response._id);
                    this.initializeCurrentQuestion();
                    this.isLoading.set(false);
                } else {
                    // No onboarding needed
                    console.log('📋 [ONBOARDING MODAL] No onboarding needed, completing');
                    this.isLoading.set(false);
                    this.onComplete.emit();
                }
            },
            error: (err) => {
                console.error('Failed to load onboarding:', err);
                this.alertService.error('Failed to load onboarding questionnaire');
                this.isLoading.set(false);
                // Still complete to avoid stuck modal
                this.onComplete.emit();
            }
        });
    }

    initializeCurrentQuestion(): void {
        const questionnaire = this.questionnaire();
        if (!questionnaire || questionnaire.questions.length === 0) return;

        const currentQuestion = questionnaire.questions[this.currentQuestionIndex()];
        this.createFormControl(currentQuestion);
    }

    createFormControl(question: Question): void {
        const validators = question.required ? [Validators.required] : [];
        
        const existingAnswer = this.answers().get(question.questionId);

        if (question.questionType === 'checkbox') {
            this.currentControl = this.fb.control(existingAnswer || [], validators);
        } else {
            this.currentControl = this.fb.control(existingAnswer || '', validators);
        }
    }

    getCurrentQuestion(): Question | null {
        const questionnaire = this.questionnaire();
        if (!questionnaire) return null;
        
        return questionnaire.questions[this.currentQuestionIndex()];
    }

    getTotalQuestions(): number {
        return this.questionnaire()?.questions.length || 0;
    }

    getProgress(): number {
        const total = this.getTotalQuestions();
        if (total === 0) return 0;
        return Math.round((this.currentQuestionIndex() / total) * 100);
    }

    onCheckboxChange(optionValue: string, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const control = this.currentControl;
        
        if (!control) return;

        const currentValue = control.value || [];
        const values = Array.isArray(currentValue) ? [...currentValue] : [];

        if (checkbox.checked) {
            if (!values.includes(optionValue)) {
                values.push(optionValue);
            }
        } else {
            const index = values.indexOf(optionValue);
            if (index > -1) {
                values.splice(index, 1);
            }
        }

        control.setValue(values);
        control.markAsTouched();
    }

    isCheckboxChecked(optionValue: string): boolean {
        const control = this.currentControl;
        if (!control) return false;
        
        const value = control.value;
        return Array.isArray(value) && value.includes(optionValue);
    }

    getRatingArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    canGoNext(): boolean {
        return this.currentQuestionIndex() < this.getTotalQuestions() - 1;
    }

    canGoPrevious(): boolean {
        return this.currentQuestionIndex() > 0;
    }

    next(): void {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion || !this.currentControl) return;

        // Validate current answer if required
        if (currentQuestion.required) {
            this.currentControl.markAsTouched();
            if (this.currentControl.invalid) {
                this.alertService.toast('Please answer this question', 'error');
                return;
            }
        }

        // Save current answer
        this.answers().set(currentQuestion.questionId, this.currentControl.value);

        // Move to next question
        if (this.canGoNext()) {
            this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
            this.initializeCurrentQuestion();
        }
    }

    previous(): void {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion || !this.currentControl) return;

        // Save current answer (even if invalid)
        this.answers().set(currentQuestion.questionId, this.currentControl.value);

        // Move to previous question
        if (this.canGoPrevious()) {
            this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
            this.initializeCurrentQuestion();
        }
    }

    submit(): void {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion || !this.currentControl) return;

        // Validate current answer
        if (currentQuestion.required) {
            this.currentControl.markAsTouched();
            if (this.currentControl.invalid) {
                this.alertService.toast('Please answer this question', 'error');
                return;
            }
        }

        // Save final answer
        this.answers().set(currentQuestion.questionId, this.currentControl.value);

        // Check if all required questions are answered
        const questionnaire = this.questionnaire();
        if (!questionnaire) return;

        const allAnswered = questionnaire.questions.every(q => {
            if (!q.required) return true;
            const answer = this.answers().get(q.questionId);
            if (q.questionType === 'checkbox') {
                return Array.isArray(answer) && answer.length > 0;
            }
            return answer !== null && answer !== undefined && answer !== '';
        });

        if (!allAnswered) {
            this.alertService.error('Please answer all required questions');
            return;
        }

        this.isSubmitting.set(true);

        // Build answers array
        const answersArray = Array.from(this.answers().entries()).map(([questionId, answer]) => ({
            questionId,
            answer
        }));

        const payload = {
            answers: answersArray,
            isComplete: true
        };

        this.questionnaireService
            .submitQuestionnaireResponse(questionnaire._id, payload)
            .subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.alertService.toast('Welcome aboard! Onboarding completed successfully', 'success');
                    
                    // Reload user data to get updated hasCompletedOnboarding
                    this.auth.getCurrentUser().subscribe({
                        next: () => {
                            this.onComplete.emit();
                        },
                        error: () => {
                            this.onComplete.emit();
                        }
                    });
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    this.alertService.error(
                        err.error?.message || 'Failed to submit onboarding questionnaire'
                    );
                }
            });
    }
}
