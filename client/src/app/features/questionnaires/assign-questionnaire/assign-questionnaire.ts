import {
    Component,
    inject,
    signal,
    OnInit,
    computed
} from '@angular/core';

import {
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { QuestionnaireService } from '../../../core/services/questionnaire.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Questionnaire } from '../../../core/models/questionnaire.model';

@Component({
    selector: 'app-assign-questionnaire',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './assign-questionnaire.html',
    styleUrl: './assign-questionnaire.scss'
})
export class AssignQuestionnaire implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly questionnaireService = inject(QuestionnaireService);
    private readonly userService = inject(UserService);
    private readonly auth = inject(AuthService);
    private readonly alertService = inject(AlertService);

    readonly isLoading = signal<boolean>(true);
    readonly isSubmitting = signal<boolean>(false);
    readonly questionnaireId = signal<string>('');
    readonly questionnaire = signal<Questionnaire | null>(null);
    readonly employees = signal<any[]>([]);
    readonly selectedEmployees = signal<Set<string>>(new Set());
    readonly searchTerm = signal<string>('');

    // Filtered employees based on search
    readonly filteredEmployees = computed(() => {
        const search = this.searchTerm().toLowerCase();
        if (!search) {
            return this.employees();
        }
        return this.employees().filter(emp => 
            emp.fullName.toLowerCase().includes(search) ||
            emp.email.toLowerCase().includes(search) ||
            (emp.department && emp.department.toLowerCase().includes(search))
        );
    });

    readonly form = this.fb.nonNullable.group({
        deadline: ['']
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.questionnaireId.set(id);
            this.loadQuestionnaire(id);
            this.loadEmployees();
        } else {
            this.alertService.error('Invalid questionnaire ID');
            this.cancel();
        }
    }

    loadQuestionnaire(id: string): void {
        this.questionnaireService.getQuestionnaireById(id).subscribe({
            next: (response) => {
                this.questionnaire.set(response.data);
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

    loadEmployees(): void {
        this.userService.getUsers().subscribe({
            next: (response) => {
                // Filter only employees from the response
                const allUsers = Array.isArray(response?.data) ? response.data : [];
                const employeeList = allUsers.filter((user: any) => user.role === 'employee');
                this.employees.set(employeeList);
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Failed to load employees');
            }
        });
    }

    onSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTerm.set(value);
    }

    toggleEmployee(employeeId: string): void {
        const selected = new Set(this.selectedEmployees());
        if (selected.has(employeeId)) {
            selected.delete(employeeId);
        } else {
            selected.add(employeeId);
        }
        this.selectedEmployees.set(selected);
    }

    isSelected(employeeId: string): boolean {
        return this.selectedEmployees().has(employeeId);
    }

    selectAll(): void {
        const allIds = new Set(this.filteredEmployees().map(emp => emp._id));
        this.selectedEmployees.set(allIds);
    }

    deselectAll(): void {
        this.selectedEmployees.set(new Set());
    }

    submit(): void {
        if (this.selectedEmployees().size === 0) {
            this.alertService.toast('Please select at least one employee', 'warning');
            return;
        }

        this.isSubmitting.set(true);

        const payload = {
            employeeIds: Array.from(this.selectedEmployees()),
            deadline: this.form.value.deadline || undefined
        };

        this.questionnaireService
            .assignQuestionnaire(this.questionnaireId(), payload)
            .subscribe({
                next: (response) => {
                    this.isSubmitting.set(false);
                    
                    const results = response.data?.results || [];
                    const assigned = results.filter((r: any) => r.status === 'assigned').length;
                    const alreadyAssigned = results.filter((r: any) => r.status === 'already_assigned').length;

                    let message = `Successfully assigned to ${assigned} employee(s)`;
                    if (alreadyAssigned > 0) {
                        message += `. ${alreadyAssigned} employee(s) were already assigned.`;
                    }

                    this.alertService.toast(message, 'success');
                    const role = this.auth.role();
                    this.router.navigate([`/${role}/questionnaires`]);
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    this.alertService.error(
                        err.error?.message || 'Failed to assign questionnaire. Please try again.'
                    );
                }
            });
    }

    cancel(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/questionnaires`]);
    }

    getTodayDate(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
