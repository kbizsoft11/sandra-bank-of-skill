import { Schema, model, Document } from "mongoose";

export type CreatedType = 'ADMIN' | 'COMPANY';

export interface ISkill extends Document {
  name: string;
  description?: string;
  categoryId: Schema.Types.ObjectId | null;
  createdBy: Schema.Types.ObjectId; // User ID who created it
  createdType: CreatedType; // ADMIN or COMPANY
  companyId?: Schema.Types.ObjectId; // null for ADMIN, filled for COMPANY
  archived: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'SkillCategory',
      required: false,
      default: null,
      sparse: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    createdType: {
      type: String,
      enum: ['ADMIN', 'COMPANY'],
      default: 'ADMIN',
      required: true,
      index: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      sparse: true,
      index: true,
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for duplicate checking
skillSchema.index({ name: 1, createdType: 1, companyId: 1 }, { sparse: true });

// Index for finding admin skills
skillSchema.index({ createdType: 1, archived: 1 });

// Index for company skills
skillSchema.index({ companyId: 1, archived: 1 });

// Index for finding skills by category
skillSchema.index({ categoryId: 1, archived: 1 });

export const Skill = model<ISkill>("Skill", skillSchema);
