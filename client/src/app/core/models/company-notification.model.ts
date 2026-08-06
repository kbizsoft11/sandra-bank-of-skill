export type NotificationType = 'info' | 'warning' | 'announcement' | 'assessment' | 'alert' | 'error' | 'success';
export type TargetAudience = 'all' | 'role' | 'department' | 'specific';
export type DeliveryMethod = 'now' | 'scheduled';
export type CompanyNotificationStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface CompanyNotification {
    _id: string;
    title: string;
    message: string;
    type: NotificationType;
    targetAudience: TargetAudience;
    targetDesignationId?: string;
    targetDepartment?: string;
    deliveryMethod: DeliveryMethod;
    scheduledAt?: string;
    sentAt?: string;
    status: CompanyNotificationStatus;
    recipientCount: number;
    createdBy: string;
    tenantId: string;
    organisationId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCompanyNotificationDto {
    title: string;
    message: string;
    type: NotificationType;
    targetAudience: TargetAudience;
    targetDesignationId?: string;
    targetDepartment?: string;
    deliveryMethod: DeliveryMethod;
    scheduledAt?: string;
}

export interface UpdateCompanyNotificationDto {
    title?: string;
    message?: string;
    type?: NotificationType;
    targetAudience?: TargetAudience;
    targetDesignationId?: string;
    targetDepartment?: string;
    deliveryMethod?: DeliveryMethod;
    scheduledAt?: string;
    status?: CompanyNotificationStatus;
}
