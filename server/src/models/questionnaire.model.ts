import { Schema, model } from "mongoose";
import { IQuestionnaire, IQuestion } from "../types/questionnaire.types";

const QuestionSchema = new Schema<IQuestion>(
    {
        questionId: {
            type: String,
            required: true,
        },
        questionText: {
            type: String,
            required: true,
            trim: true,
        },
        questionType: {
            type: String,
            enum: ['text', 'textarea', 'radio', 'checkbox', 'rating', 'date'],
            required: true,
        },
        options: {
            type: [String],
            required: false,
        },
        required: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const QuestionnaireSchema = new Schema<IQuestionnaire>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        createdBy: {
            type: String,
            required: true,
            ref: 'User',
        },
        tenantId: {
            type: String,
            required: true,
            index: true,
        },
        organisationId: {
            type: String,
            required: true,
            index: true,
        },
        questions: {
            type: [QuestionSchema],
            required: true,
            validate: {
                validator: function(questions: IQuestion[]) {
                    return questions.length > 0;
                },
                message: 'Questionnaire must have at least one question',
            },
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'archived'],
            default: 'draft',
        },
        isOnboardingQuestionnaire: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
QuestionnaireSchema.index({ tenantId: 1, organisationId: 1 });
QuestionnaireSchema.index({ createdBy: 1 });
QuestionnaireSchema.index({ status: 1 });

export const QuestionnaireModel = model<IQuestionnaire>(
    'Questionnaire',
    QuestionnaireSchema
);
