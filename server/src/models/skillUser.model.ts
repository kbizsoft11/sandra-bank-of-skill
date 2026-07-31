import { Schema, model, Document } from "mongoose";

export interface ISkillUser extends Document {
  userId: Schema.Types.ObjectId;
  skillId: Schema.Types.ObjectId;
  score: number; // 0-100
  level: string; // Beginner, Intermediate, Advanced, Expert
  assessmentId?: Schema.Types.ObjectId; // Optional: reference to assessment
  questionnaireId?: Schema.Types.ObjectId; // Optional: from questionnaire response
  lastAssessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const skillUserSchema = new Schema<ISkillUser>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    skillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    level: {
      type: String,
      required: true,
      trim: true,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      lowercase: true,
    },

    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      default: null,
      sparse: true,
    },

    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionnaireResponse',
      default: null,
      sparse: true,
      index: true,
    },

    lastAssessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: One user can have one skill record
skillUserSchema.index({ userId: 1, skillId: 1 }, { unique: true });

// Index for querying user's skills
skillUserSchema.index({ userId: 1, createdAt: -1 });

// Index for finding skills assessments
skillUserSchema.index({ assessmentId: 1 });

// Index for finding questionnaire skills
skillUserSchema.index({ questionnaireId: 1, userId: 1 });

export const SkillUser = model<ISkillUser>("SkillUser", skillUserSchema);
