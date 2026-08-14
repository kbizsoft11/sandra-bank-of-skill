import mongoose, { Schema, Document } from 'mongoose';

export interface IStatusUpdate {
  updatedBy: string;
  updatedByName: string;
  updatedByRole: string;
  previousStatus: string;
  newStatus: string;
  note?: string;
  updatedAt: Date;
}

export interface ISupportTicket extends Document {
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: 'employee' | 'company';
  statusHistory?: IStatusUpdate[];
  organisationId?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StatusUpdateSchema = new Schema<IStatusUpdate>(
  {
    updatedBy: {
      type: String,
      required: true,
    },
    updatedByName: {
      type: String,
      required: true,
    },
    updatedByRole: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdByName: {
      type: String,
      required: true,
      trim: true,
    },
    createdByEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    createdByRole: {
      type: String,
      enum: ['employee', 'company'],
      required: true,
    },
    statusHistory: {
      type: [StatusUpdateSchema],
      default: [],
    },
    organisationId: {
      type: String,
      index: true,
      required: false,
    },
    tenantId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

SupportTicketSchema.index({ organisationId: 1, createdBy: 1, createdAt: -1 });
SupportTicketSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export const SupportTicketModel = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
