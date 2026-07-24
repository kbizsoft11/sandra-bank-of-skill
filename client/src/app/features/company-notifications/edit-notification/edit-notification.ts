import {
    Component,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyNotificationService } from '../../../core/services/company-notification.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { CompanyNotification, NotificationType, TargetAudience } from '../../../core/models/company-notification.model';

@Component({
    selector: 'app-edit-notification',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
    ],
    templateUrl: './edit-notification.html',
    styleUrl: './edit-notification.scss',
})
export class EditNotification implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly notificationService = inject(CompanyNotificationService);
    private readonly roleService = inject(RoleService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);

    notificationForm!: FormGroup;
    readonly isLoading = signal<boolean>(true);
    readonly isSubmitting = signal<boolean>(false);
    readonly notificationId = signal<string>('');
    readonly existingNotification = signal<CompanyNotification | null>(null);
    readonly availableRoles = signal<{ _id: string; designationName?: string; roleName?: string }[]>([]);

    ngOnInit(): void {
        this.initForm();
        this.loadRoles();

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.notificationId.set(id);
            this.loadNotificationDetails(id);
        } else {
            this.goBack();
        }
    }

    private initForm(): void {
        this.notificationForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
            message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
            type: ['info', [Validators.required]],
            targetAudience: ['all', [Validators.required]],
            targetDesignationId: [''],
            targetDepartment: [''],
            deliveryMethod: ['now', [Validators.required]],
            scheduledAt: [''],
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

    private loadNotificationDetails(id: string): void {
        this.isLoading.set(true);
        this.notificationService.getById(id).subscribe({
            next: (res) => {
                const notif = res.data;
                this.existingNotification.set(notif);
                this.isLoading.set(false);

                if (notif) {
                    if (notif.status === 'sent') {
                        this.alertService.warning('Sent notifications cannot be modified.');
                        this.goBack();
                        return;
                    }

                    let isoScheduled = '';
                    if (notif.scheduledAt) {
                        const d = new Date(notif.scheduledAt);
                        isoScheduled = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16);
                    }

                    this.notificationForm.patchValue({
                        title: notif.title,
                        message: notif.message,
                        type: notif.type,
                        targetAudience: notif.targetAudience,
                        targetDesignationId: notif.targetDesignationId || '',
                        targetDepartment: notif.targetDepartment || '',
                        deliveryMethod: notif.deliveryMethod || 'now',
                        scheduledAt: isoScheduled,
                    });

                    this.onTargetAudienceChange(notif.targetAudience);
                }
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Failed to load notification details');
                this.isLoading.set(false);
                this.goBack();
            },
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
            title: formVal.title,
            message: formVal.message,
            type: formVal.type,
            targetAudience: formVal.targetAudience,
            targetDesignationId: formVal.targetAudience === 'role' ? formVal.targetDesignationId : undefined,
            targetDepartment: formVal.targetAudience === 'department' ? formVal.targetDepartment : undefined,
            deliveryMethod: formVal.deliveryMethod,
            scheduledAt: formVal.deliveryMethod === 'scheduled' ? formVal.scheduledAt : undefined,
            status: isDraft ? 'draft' : (formVal.deliveryMethod === 'scheduled' ? 'scheduled' : 'draft'),
        };

        this.notificationService.update(this.notificationId(), payload as any).subscribe({
            next: (res) => {
                this.isSubmitting.set(false);
                this.alertService.toast(res.message || 'Notification updated successfully', 'success');
                this.goBack();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                console.error(err);
                this.alertService.error(err.error?.message || 'Failed to update notification');
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
