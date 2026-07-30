import { Schema, model, Document } from "mongoose";

export interface ICompanyCategory extends Document {
  companyId: Schema.Types.ObjectId;
  categoryId: Schema.Types.ObjectId;
  enabled: boolean; // Can enable/disable categories
  createdAt: Date;
  updatedAt: Date;
}

const companyCategorySchema = new Schema<ICompanyCategory>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'SkillCategory',
      required: true,
      index: true,
    },

    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: Company can have mapping for category only once
companyCategorySchema.index({ companyId: 1, categoryId: 1 }, { unique: true });

// Index for finding enabled categories for a company
companyCategorySchema.index({ companyId: 1, enabled: 1 });

export const CompanyCategory = model<ICompanyCategory>(
  "CompanyCategory",
  companyCategorySchema
);
