import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'announcement' | 'assessment' | 'alert' | 'error' | 'success';
export type TargetAudience = 'all' | 'role' | 'department' | 'specific';
export type DeliveryMethod = 'now' | 'scheduled';
export type CompanyNotificationStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface ICompanyNotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: TargetAudience;
  targetDesignationId?: string;
  targetDepartment?: string;
  targetEmployeeIds?: string[]; // For 'specific' audience type
  deliveryMethod: DeliveryMethod;
  scheduledAt?: Date;
  sentAt?: Date;
  status: CompanyNotificationStatus;
  recipientCount: number;
  createdBy: string;
  tenantId: string;
  organisationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyNotificationSchema = new Schema<ICompanyNotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'announcement', 'assessment', 'alert', 'error', 'success'],
      default: 'info',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'role', 'department', 'specific'],
      default: 'all',
    },
    targetDesignationId: {
      type: String,
      default: null,
      ref: 'Role',
    },
    targetDepartment: {
      type: String,
      default: null,
      trim: true,
    },
    targetEmployeeIds: {
      type: [String],
      default: [],
    },
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
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organisationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CompanyNotificationSchema.index({ tenantId: 1, organisationId: 1, createdAt: -1 });
CompanyNotificationSchema.index({ status: 1, scheduledAt: 1 });

export const CompanyNotificationModel = mongoose.model<ICompanyNotification>(
  'CompanyNotification',
  CompanyNotificationSchema
);
