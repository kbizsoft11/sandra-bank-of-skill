import {
    Component,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyNotificationService } from '../../../core/services/company-notification.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { NotificationType, TargetAudience } from '../../../core/models/company-notification.model';

@Component({
    selector: 'app-create-notification',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
    ],
    templateUrl: './create-notification.html',
    styleUrl: './create-notification.scss',
})
export class CreateNotification implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly notificationService = inject(CompanyNotificationService);
    private readonly roleService = inject(RoleService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);

    notificationForm!: FormGroup;
    readonly isSubmitting = signal<boolean>(false);
    readonly availableRoles = signal<{ _id: string; designationName?: string; roleName?: string }[]>([]);

    ngOnInit(): void {
        this.initForm();
        this.loadRoles();
    }

    private initForm(): void {
        const defaultDate = new Date(Date.now() + 3600000);
        const isoLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);

        this.notificationForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
            message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
            type: ['info', [Validators.required]],
            targetAudience: ['all', [Validators.required]],
            targetDesignationId: [''],
            targetDepartment: [''],
            deliveryMethod: ['now', [Validators.required]],
            scheduledAt: [isoLocal],
        });
    }

    private loadRoles(): void {
        this.roleService.getRoles(true).subscribe({
            next: (res) => {
                this.availableRoles.set(res.data || []);
            },
            error: (err) => console.error('Failed to load roles:', err),
        });
    }

    onTargetAudienceChange(audience: TargetAudience): void {
        this.notificationForm.patchValue({ targetAudience: audience });
        if (audience === 'role') {
            this.notificationForm.get('targetDesignationId')?.setValidators([Validators.required]);
            this.notificationForm.get('targetDepartment')?.clearValidators();
        } else if (audience === 'department') {
            this.notificationForm.get('targetDepartment')?.setValidators([Validators.required]);
            this.notificationForm.get('targetDesignationId')?.clearValidators();
        } else {
            this.notificationForm.get('targetDesignationId')?.clearValidators();
            this.notificationForm.get('targetDepartment')?.clearValidators();
        }
        this.notificationForm.get('targetDesignationId')?.updateValueAndValidity();
        this.notificationForm.get('targetDepartment')?.updateValueAndValidity();
    }

    onDeliveryMethodChange(method: 'now' | 'scheduled'): void {
        this.notificationForm.patchValue({ deliveryMethod: method });
        const scheduledControl = this.notificationForm.get('scheduledAt');
        if (method === 'scheduled') {
            scheduledControl?.setValidators([Validators.required]);
        } else {
            scheduledControl?.clearValidators();
        }
        scheduledControl?.updateValueAndValidity();
    }

    submitForm(isDraft = false): void {
        if (!isDraft && this.notificationForm.invalid) {
            this.notificationForm.markAllAsTouched();
            this.alertService.error('Please fill in all required fields correctly.');
            return;
        }

        const formVal = this.notificationForm.value;
        this.isSubmitting.set(true);

        const payload = {
            title: formVal.title || 'Untitled Notification',
            message: formVal.message || '',
            type: formVal.type,
            targetAudience: formVal.targetAudience,
            targetDesignationId: formVal.targetAudience === 'role' ? formVal.targetDesignationId : undefined,
            targetDepartment: formVal.targetAudience === 'department' ? formVal.targetDepartment : undefined,
            deliveryMethod: isDraft ? 'now' : formVal.deliveryMethod,
            scheduledAt: (!isDraft && formVal.deliveryMethod === 'scheduled') ? formVal.scheduledAt : undefined,
        };

        this.notificationService.create(payload as any).subscribe({
            next: (res) => {
                this.isSubmitting.set(false);
                this.alertService.toast(res.message || 'Notification saved', 'success');
                this.goBack();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                console.error(err);
                this.alertService.error(err.error?.message || 'Failed to create notification');
            },
        });
    }

    goBack(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/notifications`]);
    }

    getTypeIcon(type: NotificationType): string {
        switch (type) {
            case 'warning':
                return 'bi-exclamation-triangle-fill text-warning';
            case 'announcement':
                return 'bi-megaphone-fill text-primary';
            case 'assessment':
                return 'bi-clipboard-check-fill text-purple';
            default:
                return 'bi-info-circle-fill text-info';
        }
    }
}
