import {
    Component,
    computed,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyNotificationService } from '../../../core/services/company-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RoleService } from '../../../core/services/role.service';
import { CompanyNotification, CompanyNotificationStatus, NotificationType } from '../../../core/models/company-notification.model';

@Component({
    selector: 'app-notification-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
    ],
    templateUrl: './notification-list.html',
    styleUrl: './notification-list.scss',
})
export class NotificationList implements OnInit {
    private readonly notificationService = inject(CompanyNotificationService);
    private readonly roleService = inject(RoleService);
    private readonly alertService = inject(AlertService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    readonly auth = inject(AuthService);

    readonly notifications = signal<CompanyNotification[]>([]);
    readonly isLoading = signal<boolean>(true);
    readonly searchTerm = signal<string>('');
    readonly statusFilter = signal<string>('all');
    readonly typeFilter = signal<string>('all');
    readonly rolesMap = signal<Map<string, string>>(new Map());

    // Schedule Modal state
    readonly showScheduleModal = signal<boolean>(false);
    readonly selectedNotification = signal<CompanyNotification | null>(null);
    readonly isScheduling = signal<boolean>(false);

    scheduleForm!: FormGroup;

    readonly filteredNotifications = computed(() => {
        let filtered = this.notifications();

        const search = this.searchTerm().toLowerCase();
        if (search) {
            filtered = filtered.filter(
                (n) =>
                    n.title.toLowerCase().includes(search) ||
                    n.message.toLowerCase().includes(search)
            );
        }

        const status = this.statusFilter();
        if (status !== 'all') {
            filtered = filtered.filter((n) => n.status === status);
        }

        const type = this.typeFilter();
        if (type !== 'all') {
            filtered = filtered.filter((n) => n.type === type);
        }

        return filtered;
    });

    ngOnInit(): void {
        this.initScheduleForm();
        this.loadRoles();
        this.loadNotifications();
    }

    private initScheduleForm(): void {
        const defaultDate = new Date(Date.now() + 3600000);
        const isoLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);

        this.scheduleForm = this.fb.group({
            scheduledAt: [isoLocal, [Validators.required]],
        });
    }

    private loadRoles(): void {
        this.roleService.getRoles(true).subscribe({
            next: (res) => {
                const map = new Map<string, string>();
                (res.data || []).forEach((role: any) => {
                    map.set(role._id, role.designationName || role.roleName);
                });
                this.rolesMap.set(map);
            },
            error: (err) => console.error('Failed to load roles:', err),
        });
    }

    loadNotifications(): void {
        this.isLoading.set(true);
        this.notificationService
            .getAll({
                status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
                type: this.typeFilter() !== 'all' ? this.typeFilter() : undefined,
                search: this.searchTerm() || undefined,
            })
            .subscribe({
                next: (res) => {
                    this.notifications.set(res.data || []);
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error(err);
                    this.alertService.error('Failed to load notifications');
                    this.isLoading.set(false);
                },
            });
    }

    onSearchChange(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.searchTerm.set(val);
    }

    setStatusFilter(status: string): void {
        this.statusFilter.set(status);
    }

    onTypeFilterChange(event: Event): void {
        const val = (event.target as HTMLSelectElement).value;
        this.typeFilter.set(val);
    }

    createNotification(): void {
        const role = this.auth.role();
        this.router.navigate([`/${role}/notifications/create`]);
    }

    editNotification(notification: CompanyNotification): void {
        if (notification.status === 'sent') {
            this.alertService.info('Sent notifications cannot be edited.');
            return;
        }
        const role = this.auth.role();
        this.router.navigate([`/${role}/notifications/${notification._id}/edit`]);
    }

    openScheduleModal(notification: CompanyNotification): void {
        if (notification.status === 'sent') {
            this.alertService.info('Sent notifications cannot be scheduled.');
            return;
        }

        let defaultDate = new Date(Date.now() + 3600000);
        if (notification.scheduledAt) {
            defaultDate = new Date(notification.scheduledAt);
        }

        const isoLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);

        this.selectedNotification.set(notification);
        this.scheduleForm.patchValue({ scheduledAt: isoLocal });
        this.showScheduleModal.set(true);
    }

    closeScheduleModal(): void {
        this.showScheduleModal.set(false);
        this.selectedNotification.set(null);
    }

    submitSchedule(): void {
        const notification = this.selectedNotification();
        if (!notification || this.scheduleForm.invalid) return;

        const scheduledAt = this.scheduleForm.get('scheduledAt')?.value;
        this.isScheduling.set(true);

        this.notificationService.schedule(notification._id, scheduledAt).subscribe({
            next: (res) => {
                this.isScheduling.set(false);
                this.closeScheduleModal();
                this.alertService.toast(res.message || 'Notification scheduled', 'success');
                this.loadNotifications();
            },
            error: (err) => {
                this.isScheduling.set(false);
                console.error(err);
                this.alertService.error(err.error?.message || 'Failed to schedule notification');
            },
        });
    }

    sendNow(notification: CompanyNotification): void {
        this.alertService
            .confirm(
                'Send Notification Now?',
                `Are you sure you want to send "${notification.title}" to targeted employees immediately?`
            )
            .then((confirmed) => {
                if (confirmed) {
                    this.notificationService
                        .update(notification._id, { deliveryMethod: 'now', status: 'sent' })
                        .subscribe({
                            next: () => {
                                this.alertService.toast('Notification sent successfully', 'success');
                                this.loadNotifications();
                            },
                            error: (err) => {
                                console.error(err);
                                this.alertService.error(err.error?.message || 'Failed to send notification');
                            },
                        });
                }
            });
    }

    cancelSchedule(notification: CompanyNotification): void {
        this.alertService
            .confirm(
                'Cancel Scheduled Delivery?',
                `Are you sure you want to cancel scheduled delivery for "${notification.title}"?`
            )
            .then((confirmed) => {
                if (confirmed) {
                    this.notificationService.cancel(notification._id).subscribe({
                        next: () => {
                            this.alertService.toast('Scheduled notification cancelled', 'success');
                            this.loadNotifications();
                        },
                        error: (err) => {
                            console.error(err);
                            this.alertService.error(err.error?.message || 'Failed to cancel schedule');
                        },
                    });
                }
            });
    }

    deleteNotification(notification: CompanyNotification): void {
        this.alertService.confirmDelete(notification.title).then((confirmed) => {
            if (confirmed) {
                this.notificationService.delete(notification._id).subscribe({
                    next: () => {
                        this.alertService.toast('Notification deleted successfully', 'success');
                        this.loadNotifications();
                    },
                    error: (err) => {
                        console.error(err);
                        this.alertService.error(err.error?.message || 'Failed to delete notification');
                    },
                });
            }
        });
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

    getTypeBadgeClass(type: NotificationType): string {
        switch (type) {
            case 'warning':
                return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
            case 'announcement':
                return 'bg-primary-subtle text-primary-emphasis border-primary-subtle';
            case 'assessment':
                return 'bg-purple-subtle text-purple-emphasis border-purple-subtle';
            default:
                return 'bg-info-subtle text-info-emphasis border-info-subtle';
        }
    }

    getStatusBadgeClass(status: CompanyNotificationStatus): string {
        switch (status) {
            case 'sent':
                return 'bg-success text-white';
            case 'scheduled':
                return 'bg-primary text-white';
            case 'cancelled':
                return 'bg-danger text-white';
            case 'draft':
            default:
                return 'bg-secondary text-white';
        }
    }

    getTargetLabel(notification: CompanyNotification): string {
        if (notification.targetAudience === 'role' && notification.targetDesignationId) {
            const roleName = this.rolesMap().get(notification.targetDesignationId);
            return roleName ? `Role: ${roleName}` : 'Specific Role';
        } else if (notification.targetAudience === 'department' && notification.targetDepartment) {
            return `Dept: ${notification.targetDepartment}`;
        }
        return 'All Employees';
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
