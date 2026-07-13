import { Schema, model } from "mongoose";
import { IQuestionnaireResponse, IAnswer } from "../types/questionnaire.types";

const AnswerSchema = new Schema<IAnswer>(
    {
        questionId: {
            type: String,
            required: true,
        },
        answer: {
            type: Schema.Types.Mixed, // Can be string or array of strings
            required: true,
        },
    },
    { _id: false }
);

const QuestionnaireResponseSchema = new Schema<IQuestionnaireResponse>(
    {
        questionnaireId: {
            type: String,
            required: true,
            ref: 'Questionnaire',
            index: true,
        },
        employeeId: {
            type: String,
            required: true,
            ref: 'User',
            index: true,
        },
        assignedBy: {
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
        answers: {
            type: [AnswerSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
        },
        assignedAt: {
            type: Date,
            default: Date.now,
        },
        deadline: {
            type: Date,
            required: false,
        },
        startedAt: {
            type: Date,
            required: false,
        },
        completedAt: {
            type: Date,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
QuestionnaireResponseSchema.index({ tenantId: 1, organisationId: 1 });
QuestionnaireResponseSchema.index({ employeeId: 1, status: 1 });
QuestionnaireResponseSchema.index({ questionnaireId: 1, employeeId: 1 }, { unique: true });
QuestionnaireResponseSchema.index({ assignedBy: 1 });

export const QuestionnaireResponseModel = model<IQuestionnaireResponse>(
    'QuestionnaireResponse',
    QuestionnaireResponseSchema
);
