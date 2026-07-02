import {
  Schema,
  model,
  Document
} from 'mongoose';

export interface ISkillCategory extends Document {
  cat_name: string;
  cat_desc?: string;
}

const skillCategorySchema = new Schema<ISkillCategory>(
  {
    cat_name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    cat_desc: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SkillCategory = model<ISkillCategory>(
  'SkillCategory',
  skillCategorySchema
);