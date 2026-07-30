import {
  Schema,
  model,
  Document
} from 'mongoose';

export type CreatedType = 'ADMIN' | 'COMPANY';

export interface ISkillCategory extends Document {
  name: string;
  description?: string;
  createdBy: Schema.Types.ObjectId; // User ID who created it
  createdType: CreatedType; // ADMIN or COMPANY
  companyId?: Schema.Types.ObjectId; // null for ADMIN, filled for COMPANY
  archived: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const skillCategorySchema = new Schema<ISkillCategory>(
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

// Drop old indexes if they exist
skillCategorySchema.pre('init', function() {
  // This will be called when a document is created
});

// Composite index for duplicate checking
skillCategorySchema.index({ name: 1, createdType: 1, companyId: 1 }, { sparse: true });

// Index for finding admin categories
skillCategorySchema.index({ createdType: 1, archived: 1 });

// Index for company categories
skillCategorySchema.index({ companyId: 1, archived: 1 });

export const SkillCategory = model<ISkillCategory>(
  'SkillCategory',
  skillCategorySchema
);
