import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'announcement' | 'alert';
export type TargetRecipient = 'all_companies' | 'all_employees' | 'all_users' | 'specific_company' | 'specific_employee';
export type DeliveryMethod = 'now' | 'scheduled';
export type AdminNotificationStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface IAdminNotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  targetRecipient: TargetRecipient;
  targetCompanyIds?: string[]; // For specific_company
  targetEmployeeIds?: string[]; // For specific_employee
  deliveryMethod: DeliveryMethod;
  scheduledAt?: Date;
  sentAt?: Date;
  status: AdminNotificationStatus;
  recipientCount: number;
  companiesNotifiedCount?: number; // Track how many companies received it
  employeesNotifiedCount?: number; // Track how many employees received it
  createdBy: string; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}

const AdminNotificationSchema = new Schema<IAdminNotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'announcement', 'alert'],
      default: 'info',
    },
    targetRecipient: {
      type: String,
      enum: ['all_companies', 'all_employees', 'all_users', 'specific_company', 'specific_employee'],
      default: 'all_companies',
      required: true,
    },
    targetCompanyIds: [
      {
        type: String,
        ref: 'User', // References company users
      },
    ],
    targetEmployeeIds: [
      {
        type: String,
        ref: 'User', // References employee users
      },
    ],
    deliveryMethod: {
      type: String,
      enum: ['now', 'scheduled'],
      default: 'now',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'cancelled'],
      default: 'draft',
      index: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    companiesNotifiedCount: {
      type: Number,
      default: 0,
    },
    employeesNotifiedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
AdminNotificationSchema.index({ status: 1, scheduledAt: 1 });
AdminNotificationSchema.index({ createdAt: -1 });
AdminNotificationSchema.index({ createdBy: 1, createdAt: -1 });

export const AdminNotificationModel = mongoose.model<IAdminNotification>(
  'AdminNotification',
  AdminNotificationSchema
);
