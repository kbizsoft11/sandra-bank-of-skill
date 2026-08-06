import mongoose, { Schema, Document } from 'mongoose';

interface IActivity extends Document {
  userId: Schema.Types.ObjectId;
  userName: string; // User's full name
  userEmail: string; // User's email
  userRole: 'admin' | 'company' | 'employee'; // User's role at time of action
  actionType: string; // Type of action: 'login', 'logout', 'create', 'update', 'delete', 'assign', 'unassign', 'view', 'export', 'import', etc.
  resource: string; // Resource type: 'skill', 'skill_category', 'user', 'company', 'assessment', 'course', etc.
  resourceId?: Schema.Types.ObjectId; // ID of affected resource
  resourceName?: string; // Name of affected resource (for easier reading)
  description: string; // Human-readable description
  status: 'success' | 'failure' | 'pending'; // Action status
  companyId?: Schema.Types.ObjectId; // Company ID (null for admin actions, set for company/employee actions)
  ipAddress?: string; // IP address of request
  userAgent?: string; // Browser/client user agent
  changes?: Record<string, { old: any; new: any }>; // Changed fields (for update operations)
  details?: Record<string, any>; // Additional metadata
  errorMessage?: string; // Error message if action failed
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ['admin', 'company', 'employee'],
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'login',
        'logout',
        'create',
        'update',
        'delete',
        'assign',
        'unassign',
        'view',
        'export',
        'import',
        'bulk_action',
        'password_reset',
        'email_verify',
        'account_activate',
        'account_deactivate',
      ],
    },
    resource: {
      type: String,
      required: true,
      index: true,
      enum: [
        'skill',
        'skill_category',
        'user',
        'company',
        'assessment',
        'course',
        'questionnaire',
        'document',
        'system_settings',
      ],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    resourceName: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: false,
      index: true,
      sparse: true,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ actionType: 1, createdAt: -1 });
ActivitySchema.index({ resource: 1, createdAt: -1 });
ActivitySchema.index({ companyId: 1, createdAt: -1 });
ActivitySchema.index({ userRole: 1, createdAt: -1 });
ActivitySchema.index({ status: 1, createdAt: -1 });
// Composite index for admin viewing all activities or company viewing own
ActivitySchema.index({ companyId: 1, userRole: 1, createdAt: -1 });
// Index for analytics queries
ActivitySchema.index({ actionType: 1, resource: 1, createdAt: -1 });

export const ActivityModel = mongoose.model<IActivity>('Activity', ActivitySchema);
