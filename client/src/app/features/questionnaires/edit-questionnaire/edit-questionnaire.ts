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
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { SkillService } from '../../../core/services/skill.service';
import { RoleService } from '../../../core/services/role.service';
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
    private readonly skillCategoryService = inject(SkillCategoryService);
    private readonly skillService = inject(SkillService);
    private readonly roleService = inject(RoleService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isLoading = signal<boolean>(true);
    readonly isSubmitting = signal<boolean>(false);
    readonly questionnaireId = signal<string>('');
    readonly skillCategories = signal<any[]>([]);
    readonly skills = signal<any[]>([]);
    readonly roles = signal<any[]>([]);

    readonly questionTypes: { value: QuestionType; label: string }[] = [
        { value: 'text', label: 'Short Text' },
        { value: 'textarea', label: 'Long Text' },
        { value: 'radio', label: 'Single Choice' },
        { value: 'checkbox', label: 'Multiple Choice' },
        { value: 'rating', label: 'Rating (1-5)' },
        { value: 'date', label: 'Date' },
        { value: 'skill', label: 'Skill Question' },
    ];

    readonly form = this.fb.nonNullable.group({
        status: [
            'draft' as QuestionnaireStatus,
            Validators.required
        ],
        skillCategoryId: ['', Validators.required],
        targetDesignationId: [''],
        questions: this.fb.array([])
    });

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    ngOnInit(): void {
        this.loadSkillCategories();
        this.loadRoles();

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.questionnaireId.set(id);
            this.loadQuestionnaire(id);
        } else {
            this.alertService.error('Invalid questionnaire ID');
            this.cancel();
        }
    }

    loadSkillCategories(): void {
        this.skillCategoryService.getAll().subscribe({
            next: (response) => {
                this.skillCategories.set(response.data || []);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Unable to load skill categories');
            }
        });
    }

    loadSkills(categoryId?: string, initializeQuestions = false): void {
        if (!categoryId) {
            this.skills.set([]);
            if (initializeQuestions) {
                this.questions.clear();
            }
            return;
        }

        this.skillService.getSkills({ cat_id: categoryId }).subscribe({
            next: (response) => {
                const skills = response.data.skills || [];
                this.skills.set(skills);
                if (initializeQuestions) {
                    this.setQuestionsForSkills(skills);
                }
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Unable to load skills for selected category');
            }
        });
    }

    loadRoles(): void {
        this.roleService.getRoles(true).subscribe({
            next: (response) => {
                this.roles.set(response.data || []);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Unable to load employee roles');
            }
        });
    }

    onSkillCategoryChange(): void {
        const categoryId = this.form.get('skillCategoryId')?.value;
        this.loadSkills(categoryId, true);
    }

    setQuestionsForSkills(skills: any[]): void {
        const questionsArray = this.questions;
        while (questionsArray.length) {
            questionsArray.removeAt(0);
        }

        skills.forEach((skill, index) => {
            const questionGroup = this.fb.nonNullable.group({
                questionId: [`${skill._id}-${Date.now()}-${index}`],
                skillId: [skill._id],
                skillName: [skill.skill_name],
                questionText: [
                    `How would you rate ${skill.skill_name}?`,
                    [Validators.required, Validators.minLength(5)]
                ],
                questionType: ['skill' as QuestionType, Validators.required],
                skillDescription: [''],
                options: this.fb.array([]),
                required: [true]
            });
            questionsArray.push(questionGroup);
        });
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
            status: questionnaire.status,
            skillCategoryId: questionnaire.skillCategoryId || '',
            targetDesignationId: questionnaire.targetDesignationId || ''
        });

        if (questionnaire.skillCategoryId) {
            this.loadSkills(questionnaire.skillCategoryId, false);
        }

        // Clear existing questions
        while (this.questions.length) {
            this.questions.removeAt(0);
        }

        // Add questions from loaded data
        questionnaire.questions.forEach(question => {
            const questionGroup = this.fb.nonNullable.group({
                questionId: [question.questionId],
                skillId: [question.skillId || ''],
                skillName: [question.skillName || ''],
                questionText: [
                    question.questionText,
                    [Validators.required, Validators.minLength(5)]
                ],
                questionType: [
                    question.questionType,
                    Validators.required
                ],
                skillDescription: [question.skillDescription || ''],
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

    createQuestionFormGroup(skill?: any): FormGroup {
        return this.fb.nonNullable.group({
            questionId: [''],
            skillId: [skill?._id || ''],
            skillName: [skill?.skill_name || ''],
            questionText: [
                skill ? `How would you rate ${skill.skill_name}?` : '',
                [Validators.required, Validators.minLength(5)]
            ],
            questionType: ['skill' as QuestionType, Validators.required],
            skillDescription: [''],
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
            status: formValue.status,
            skillCategoryId: formValue.skillCategoryId || undefined,
            targetDesignationId: formValue.targetDesignationId || undefined,
            questions: formValue.questions.map((q: any, index: number) => ({
                questionId: q.questionId || undefined, // Preserve existing IDs
                skillId: q.skillId || undefined,
                skillName: q.skillName || undefined,
                questionText: q.questionText,
                questionType: q.questionType,
                skillDescription: q.skillDescription,
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
