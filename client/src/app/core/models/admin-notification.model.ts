export type NotificationType = 'info' | 'warning' | 'announcement' | 'alert';
export type TargetRecipient = 'all_companies' | 'all_employees' | 'all_users' | 'specific_company' | 'specific_employee';
export type DeliveryMethod = 'now' | 'scheduled';
export type AdminNotificationStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface AdminNotification {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetRecipient: TargetRecipient;
  targetCompanyIds?: string[];
  targetEmployeeIds?: string[];
  deliveryMethod: DeliveryMethod;
  scheduledAt?: string;
  sentAt?: string;
  status: AdminNotificationStatus;
  recipientCount: number;
  companiesNotifiedCount?: number;
  employeesNotifiedCount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  targetRecipient: TargetRecipient;
  targetCompanyIds?: string[];
  targetEmployeeIds?: string[];
  deliveryMethod: DeliveryMethod;
  scheduledAt?: string;
}

export interface UpdateAdminNotificationDto {
  title?: string;
  message?: string;
  type?: NotificationType;
  targetRecipient?: TargetRecipient;
  targetCompanyIds?: string[];
  targetEmployeeIds?: string[];
  deliveryMethod?: DeliveryMethod;
  scheduledAt?: string;
  status?: AdminNotificationStatus;
}
