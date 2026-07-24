import { Schema, model, Document } from "mongoose";

export interface ISkill extends Document {
  cat_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  skill_name: string;
  skill_desc?: string;
  skill_level: string;
  skill_score: number;
  interest_level?: number;
  isFromQuestionnaire?: boolean;
  questionnaireResponseId?: Schema.Types.ObjectId;
  created_at: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    cat_id: {
      type: Schema.Types.ObjectId,
      ref: "SkillCategory",
      required: true,
      index: true,
    },

    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    skill_name: {
      type: String,
      required: true,
    },

    skill_desc: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    skill_level: {
      type: String,
      required: true,
      trim: true,
    },

    skill_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    interest_level: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },

    isFromQuestionnaire: {
      type: Boolean,
      default: false,
    },

    questionnaireResponseId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionnaireResponse",
      required: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
    versionKey: false,
  }
);

skillSchema.index({
  cat_id: 1,
  user_id: 1,
  skill_name: 1,
});

export const Skill = model<ISkill>("Skill", skillSchema);