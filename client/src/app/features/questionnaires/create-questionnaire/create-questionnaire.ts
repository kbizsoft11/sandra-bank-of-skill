import {
    Component,
    inject,
    signal
} from '@angular/core';

import {
    FormBuilder,
    FormArray,
    ReactiveFormsModule,
    Validators,
    FormGroup
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { QuestionType, QuestionnaireStatus } from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-create-questionnaire',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './create-questionnaire.html',
    styleUrl: './create-questionnaire.scss'
})
export class CreateQuestionnaire {

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isSubmitting = signal<boolean>(false);

    readonly questionTypes: { value: QuestionType; label: string }[] = [
        { value: 'text', label: 'Short Text' },
        { value: 'textarea', label: 'Long Text' },
        { value: 'radio', label: 'Single Choice' },
        { value: 'checkbox', label: 'Multiple Choice' },
        { value: 'rating', label: 'Rating (1-5)' },
        { value: 'date', label: 'Date' },
    ];

    readonly form = this.fb.nonNullable.group({
        title: [
            '',
            [Validators.required, Validators.minLength(3)]
        ],
        description: [
            '',
            [Validators.required, Validators.minLength(10)]
        ],
        status: [
            'draft' as QuestionnaireStatus,
            Validators.required
        ],
        questions: this.fb.array([])
    });

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    ngOnInit(): void {
        // Add one question by default
        this.addQuestion();
    }

    createQuestionFormGroup(): FormGroup {
        return this.fb.nonNullable.group({
            questionText: [
                '',
                [Validators.required, Validators.minLength(5)]
            ],
            questionType: [
                'text' as QuestionType,
                Validators.required
            ],
            options: this.fb.array([]),
            required: [true]
        });
    }

    addQuestion(): void {
        this.questions.push(this.createQuestionFormGroup());
    }

    removeQuestion(index: number): void {
        if (this.questions.length > 1) {
            this.questions.removeAt(index);
        } else {
            this.alertService.toast('At least one question is required', 'warning');
        }
    }

    getQuestionOptions(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('options') as FormArray;
    }

    addOption(questionIndex: number): void {
        const options = this.getQuestionOptions(questionIndex);
        options.push(this.fb.control('', Validators.required));
    }

    removeOption(questionIndex: number, optionIndex: number): void {
        const options = this.getQuestionOptions(questionIndex);
        if (options.length > 1) {
            options.removeAt(optionIndex);
        } else {
            this.alertService.toast('At least one option is required', 'warning');
        }
    }

    onQuestionTypeChange(questionIndex: number): void {
        const question = this.questions.at(questionIndex);
        const questionType = question.get('questionType')?.value;
        const options = this.getQuestionOptions(questionIndex);

        // Clear existing options
        options.clear();

        // Add default options for radio/checkbox types
        if (questionType === 'radio' || questionType === 'checkbox') {
            this.addOption(questionIndex);
            this.addOption(questionIndex);
        }
    }

    needsOptions(questionType: QuestionType): boolean {
        return questionType === 'radio' || questionType === 'checkbox';
    }

    moveQuestionUp(index: number): void {
        if (index > 0) {
            const question = this.questions.at(index);
            this.questions.removeAt(index);
            this.questions.insert(index - 1, question);
        }
    }

    moveQuestionDown(index: number): void {
        if (index < this.questions.length - 1) {
            const question = this.questions.at(index);
            this.questions.removeAt(index);
            this.questions.insert(index + 1, question);
        }
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.markAllQuestionsAsTouched();
            this.alertService.toast('Please fill all required fields', 'error');
            return;
        }

        // Validate that choice questions have options
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions.at(i);
            const questionType = question.get('questionType')?.value;
            const options = this.getQuestionOptions(i);

            if (this.needsOptions(questionType) && options.length === 0) {
                this.alertService.toast(
                    `Question ${i + 1}: Please add at least one option for ${questionType} questions`,
                    'error'
                );
                return;
            }
        }

        this.isSubmitting.set(true);

        const formValue = this.form.getRawValue();
        
        // Transform questions to match backend format
        const payload = {
            title: formValue.title,
            description: formValue.description,
            status: formValue.status,
            questions: formValue.questions.map((q: any, index: number) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options || [],
                required: q.required,
                order: index
            }))
        };

        this.questionnaireService
            .createQuestionnaire(payload)
            .subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.alertService.toast('Questionnaire created successfully', 'success');
                    const role = this.auth.role();
                    this.router.navigate([`/${role}/questionnaires`]);
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    this.alertService.error(
                        err.error?.message || 'Failed to create questionnaire. Please try again.'
                    );
                }
            });
    }

    cancel(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires`]);
    }

    private markAllQuestionsAsTouched(): void {
        this.questions.controls.forEach((question) => {
            question.markAllAsTouched();
            const options = question.get('options') as FormArray;
            options.controls.forEach(option => option.markAsTouched());
        });
    }
}
