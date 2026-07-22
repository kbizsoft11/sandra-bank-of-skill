import mongoose, { Schema, Document } from 'mongoose';

interface IActivity extends Document {
  userId: string;
  user: string; // Full name or identifier
  activity: string; // Description of the activity
  type: string; // Type of activity (e.g., 'company_created', 'employee_added', 'skill_added')
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
    },
    activity: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });

export const ActivityModel = mongoose.model<IActivity>('Activity', ActivitySchema);
