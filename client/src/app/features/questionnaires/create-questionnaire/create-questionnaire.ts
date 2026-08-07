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
import { SkillCategoryService } from '../../../core/services/skill-category.service';
import { SkillService } from '../../../core/services/skill.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { QuestionType, QuestionnaireStatus } from '../../../core/models/questionnaire.model';
import { CompanySkillCategoryService } from '../../../core/services/company-skill-category.service';
import { forkJoin } from 'rxjs';

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
    private readonly skillCategoryService = inject(SkillCategoryService);
    private readonly companySkillCategoryService = inject(CompanySkillCategoryService);
    private readonly skillService = inject(SkillService);
    private readonly roleService = inject(RoleService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isSubmitting = signal<boolean>(false);
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
        questions: this.fb.array([], Validators.required)
    });

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    ngOnInit(): void {
        this.loadSkillCategories();
        this.loadRoles();
    }

    loadSkillCategories(): void {
        forkJoin({
            categories: this.skillCategoryService.getAll({ limit: 1000 }),
            mappings: this.companySkillCategoryService.getAll(),
        }).subscribe({
            next: ({ categories, mappings }) => {
                const result = categories.data as any;
                const allCategories = Array.isArray(result) ? result : result?.categories || [];
                const selectedAdminCategoryIds = new Set(
                    (mappings.data || []).map((mapping: any) => String(mapping.skillCategoryId || mapping.categoryId))
                );
                const currentUser = this.auth.user();
                // Support both current organisation ownership and legacy records
                // that stored the company user's id in companyId.
                const companyIdentityIds = new Set(
                    [currentUser?.organisationId, currentUser?._id]
                        .filter(Boolean)
                        .map(String)
                );
                const accessibleCategories = allCategories.filter((category: any) => {
                    if (category.status === 'inactive' || category.archived) return false;

                    const categoryCompanyId = typeof category.companyId === 'object'
                        ? category.companyId?._id
                        : category.companyId;
                    const categoryCreatedBy = typeof category.createdBy === 'object'
                        ? category.createdBy?._id
                        : category.createdBy;

                    // Match the ownership rule used by company category management,
                    // including legacy records stored against the creating user.
                    const isCompanyCategory = category.createdType === 'COMPANY'
                        && (companyIdentityIds.has(String(categoryCompanyId))
                            || companyIdentityIds.has(String(categoryCreatedBy)));

                    return isCompanyCategory
                        || (category.createdType === 'ADMIN' && selectedAdminCategoryIds.has(String(category._id)));
                });

                this.skillCategories.set(accessibleCategories);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Unable to load skill categories');
            }
        });
    }

    loadSkills(categoryId?: string): void {
        if (!categoryId) {
            this.skills.set([]);
            this.questions.clear();
            return;
        }

        this.skillService.getSkills({ categoryId, status: 'active', limit: '1000' }).subscribe({
            next: (response) => {
                const skills = response.data?.skills || [];
                this.skills.set(skills);
                this.setQuestionsForSkills(skills);
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
        this.loadSkills(categoryId);
    }

    createQuestionFormGroup(skill?: any): FormGroup {
        const skillName = skill?.name || skill?.skill_name || '';

        return this.fb.nonNullable.group({
            questionId: [''],
            skillId: [skill?._id || ''],
            skillName: [skillName],
            questionText: [
                skillName ? `Tell us about your experience with ${skillName}.` : '',
                [Validators.required, Validators.minLength(5)]
            ],
            questionType: [
                'skill' as QuestionType,
                Validators.required
            ],
            skillDescription: [''],
            options: this.fb.array([]),
            required: [true]
        });
    }

    setQuestionsForSkills(skills: any[]): void {
        const questionsArray = this.questions;
        while (questionsArray.length) {
            questionsArray.removeAt(0);
        }

        skills.forEach((skill, index) => {
            const questionGroup = this.createQuestionFormGroup(skill);
            questionGroup.patchValue({
                questionId: `${skill._id}-${Date.now()}-${index}`,
            });
            questionsArray.push(questionGroup);
        });
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
                questionId: q.questionId || undefined,
                skillId: q.skillId,
                skillName: q.skillName,
                questionText: q.questionText,
                questionType: q.questionType,
                skillDescription: q.skillDescription,
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
