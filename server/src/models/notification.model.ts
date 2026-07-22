import mongoose, { Schema, Document } from 'mongoose';

interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  isRead: boolean;
  relatedTo?: string; // e.g., 'company', 'employee', 'questionnaire'
  relatedId?: string; // ID of related document
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
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
      enum: ['success', 'warning', 'info', 'error'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedTo: {
      type: String,
      default: null,
    },
    relatedId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
