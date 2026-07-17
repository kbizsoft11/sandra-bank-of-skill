import {
  Schema,
  model,
  Document
} from 'mongoose';

export interface ICompanySkillCategory extends Document {
  companyId: string;
  skillCategoryId: string;
  displayName: string;
}

const companySkillCategorySchema = new Schema<ICompanySkillCategory>(
  {
    companyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    skillCategoryId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

companySkillCategorySchema.index(
  { companyId: 1, skillCategoryId: 1 },
  { unique: true }
);

export const CompanySkillCategory = model<ICompanySkillCategory>(
  'CompanySkillCategory',
  companySkillCategorySchema
);
