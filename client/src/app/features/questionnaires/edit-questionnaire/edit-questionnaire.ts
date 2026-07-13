import {
    Component,
    inject,
    signal,
    OnInit
} from '@angular/core';

import {
    FormBuilder,
    FormArray,
    ReactiveFormsModule,
    Validators,
    FormGroup
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { QuestionType, Questionnaire, QuestionnaireStatus } from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-edit-questionnaire',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './edit-questionnaire.html',
    styleUrl: './edit-questionnaire.scss'
})
export class EditQuestionnaire implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isLoading = signal<boolean>(true);
    readonly isSubmitting = signal<boolean>(false);
    readonly questionnaireId = signal<string>('');

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
        
        this.questionnaireService.getQuestionnaireById(id).subscribe({
            next: (response) => {
                const questionnaire: Questionnaire = response.data;
                this.populateForm(questionnaire);
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

    populateForm(questionnaire: Questionnaire): void {
        // Set basic fields
        this.form.patchValue({
            title: questionnaire.title,
            description: questionnaire.description,
            status: questionnaire.status
        });

        // Clear existing questions
        while (this.questions.length) {
            this.questions.removeAt(0);
        }

        // Add questions from loaded data
        questionnaire.questions.forEach(question => {
            const questionGroup = this.fb.nonNullable.group({
                questionId: [question.questionId],
                questionText: [
                    question.questionText,
                    [Validators.required, Validators.minLength(5)]
                ],
                questionType: [
                    question.questionType,
                    Validators.required
                ],
                options: this.fb.array([]),
                required: [question.required]
            });

            // Add options if they exist
            if (question.options && question.options.length > 0) {
                const optionsArray = questionGroup.get('options') as FormArray;
                question.options.forEach(option => {
                    optionsArray.push(this.fb.control(option, Validators.required));
                });
            }

            this.questions.push(questionGroup);
        });
    }

    createQuestionFormGroup(): FormGroup {
        return this.fb.nonNullable.group({
            questionId: [''],
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
                questionId: q.questionId || undefined, // Preserve existing IDs
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options || [],
                required: q.required,
                order: index
            }))
        };

        this.questionnaireService
            .updateQuestionnaire(this.questionnaireId(), payload)
            .subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.alertService.toast('Questionnaire updated successfully', 'success');
                    const role = this.auth.role();
                    this.router.navigate([`/${role}/questionnaires`]);
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    this.alertService.error(
                        err.error?.message || 'Failed to update questionnaire. Please try again.'
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
