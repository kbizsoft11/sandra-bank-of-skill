import { Schema, model, Document } from 'mongoose';

export interface INotificationReadReceipt extends Document {
  notificationId: string;
  userId: string;
  isRead: boolean;
  readAt?: Date;
  // Notification details (denormalized for efficiency)
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'announcement' | 'alert';
  source?: 'admin' | 'company'; // Track notification source
  createdAt: Date;
  updatedAt: Date;
}

const notificationReadReceiptSchema = new Schema<INotificationReadReceipt>(
  {
    notificationId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Notification details
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'error', 'success', 'announcement', 'alert'],
      default: 'info',
    },
    source: {
      type: String,
      enum: ['admin', 'company'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast querying: get all unread notifications for a user
notificationReadReceiptSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Compound index for analytics: count read receipts per notification
notificationReadReceiptSchema.index({ notificationId: 1, isRead: 1 });

// Unique index to prevent duplicate entries
notificationReadReceiptSchema.index({ notificationId: 1, userId: 1 }, { unique: true });

export const NotificationReadReceiptModel = model<INotificationReadReceipt>(
  'NotificationReadReceipt',
  notificationReadReceiptSchema
);
