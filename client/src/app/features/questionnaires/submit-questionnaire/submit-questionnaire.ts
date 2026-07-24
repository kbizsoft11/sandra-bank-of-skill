import {
    Component,
    inject,
    signal,
    OnInit
} from '@angular/core';

import {
    FormBuilder,
    FormGroup,
    FormControl,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { 
    Questionnaire, 
    QuestionnaireResponse,
    Question,
    QuestionType 
} from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-submit-questionnaire',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './submit-questionnaire.html',
    styleUrl: './submit-questionnaire.scss'
})
export class SubmitQuestionnaire implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isLoading = signal<boolean>(true);
    readonly isSaving = signal<boolean>(false);
    readonly isSubmitting = signal<boolean>(false);
    readonly questionnaireId = signal<string>('');
    readonly questionnaire = signal<Questionnaire | null>(null);
    readonly response = signal<QuestionnaireResponse | null>(null);
    readonly isCompleted = signal<boolean>(false);

    form!: FormGroup;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.questionnaireId.set(id);
            this.loadQuestionnaire(id);
        } else {
            this.alertService.error('Invalid questionnaire ID');
            this.cancel();
        }
    }

    loadQuestionnaire(id: string): void {
        this.isLoading.set(true);
        
        this.questionnaireService.getQuestionnaireForEmployee(id).subscribe({
            next: (response) => {
                this.questionnaire.set(response.data.questionnaire);
                this.response.set(response.data.response);
                this.isCompleted.set(response.data.response.status === 'completed');
                this.buildForm();
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Failed to load questionnaire');
                this.isLoading.set(false);
                this.cancel();
            }
        });
    }

    buildForm(): void {
        const questionnaire = this.questionnaire();
        const response = this.response();
        
        if (!questionnaire) return;

        const group: { [key: string]: FormControl } = {};

        questionnaire.questions.forEach((question) => {
            const existingAnswer = response?.answers.find(a => a.questionId === question.questionId);
            const validators = question.required ? [Validators.required] : [];

            if (question.questionType === 'checkbox') {
                // For checkbox, default to empty array
                group[question.questionId] = this.fb.control(
                    existingAnswer?.answer || [],
                    validators
                );
            } else if (question.questionType === 'skill') {
                // For skill questions, store both skillLevel and interestLevel
                const answerValue = existingAnswer?.answer;
                const skillAnswer = typeof answerValue === 'object' && answerValue !== null && !Array.isArray(answerValue)
                    ? answerValue as { skillLevel?: string; interestLevel?: string }
                    : undefined;

                group[question.questionId + '_skill'] = this.fb.control(
                    skillAnswer?.skillLevel || '',
                    validators
                );
                group[question.questionId + '_interest'] = this.fb.control(
                    skillAnswer?.interestLevel || '',
                    validators
                );
            } else {
                group[question.questionId] = this.fb.control(
                    existingAnswer?.answer || '',
                    validators
                );
            }
        });

        this.form = this.fb.group(group);

        // Disable form if completed
        if (this.isCompleted()) {
            this.form.disable();
        }
    }

    onCheckboxChange(questionId: string, optionValue: string, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const control = this.form.get(questionId);
        
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

    isCheckboxChecked(questionId: string, optionValue: string): boolean {
        const control = this.form?.get(questionId);
        if (!control) return false;
        
        const value = control.value;
        return Array.isArray(value) && value.includes(optionValue);
    }

    getRatingArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    saveProgress(): void {
        this.isSaving.set(true);

        const answers = this.buildAnswersArray();
        const payload = {
            answers,
            isComplete: false
        };

        this.questionnaireService
            .submitQuestionnaireResponse(this.questionnaireId(), payload)
            .subscribe({
                next: () => {
                    this.isSaving.set(false);
                    this.alertService.toast('Progress saved successfully', 'success');
                },
                error: (err) => {
                    console.error(err);
                    this.isSaving.set(false);
                    this.alertService.error('Failed to save progress');
                }
            });
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.alertService.toast('Please answer all required questions', 'error');
            return;
        }

        this.isSubmitting.set(true);

        const answers = this.buildAnswersArray();
        const payload = {
            answers,
            isComplete: true
        };

        this.questionnaireService
            .submitQuestionnaireResponse(this.questionnaireId(), payload)
            .subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.alertService.toast('Questionnaire submitted successfully', 'success');
                    const role = this.auth.role();
                    this.router.navigate([`/${role}/my-questionnaires`]);
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    this.alertService.error(
                        err.error?.message || 'Failed to submit questionnaire'
                    );
                }
            });
    }

    buildAnswersArray(): any[] {
        const questionnaire = this.questionnaire();
        if (!questionnaire) return [];

        return questionnaire.questions.map(question => {
            if (question.questionType === 'skill') {
                // For skill questions, combine skillLevel and interestLevel
                return {
                    questionId: question.questionId,
                    answer: {
                        skillLevel: parseInt(this.form.get(question.questionId + '_skill')?.value) || null,
                        interestLevel: parseInt(this.form.get(question.questionId + '_interest')?.value) || null
                    }
                };
            }
            return {
                questionId: question.questionId,
                answer: this.form.get(question.questionId)?.value || ''
            };
        });
    }

    cancel(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/my-questionnaires`]);
    }

    getQuestionNumber(question: Question): number {
        const questionnaire = this.questionnaire();
        if (!questionnaire) return 0;
        return questionnaire.questions.indexOf(question) + 1;
    }

    getSkillLevelArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    getInterestLevelArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    getSkillLevelLabel(level: number): string {
        const labels: { [key: number]: string } = {
            1: 'Beginner',
            2: 'Intermediate',
            3: 'Advanced',
            4: 'Expert',
            5: 'Master'
        };
        return labels[level] || 'Unknown';
    }

    getInterestLevelLabel(level: number): string {
        const labels: { [key: number]: string } = {
            1: 'Not Interested',
            2: 'Somewhat',
            3: 'Interested',
            4: 'Very Interested',
            5: 'Highly Interested'
        };
        return labels[level] || 'Unknown';
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
