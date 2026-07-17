import { Schema, model } from "mongoose";

/**
 * Individual question answer model
 * Stores each question's answer separately for better tracking and flexibility
 */

export interface IQuestionAnswer {
    questionnaireId: string;
    questionnaireResponseId: string;
    employeeId: string;
    questionId: string;
    skillLevel?: number | null;      // 1-5 or null (for skill-type questions)
    interestLevel?: number | null;   // 1-5 or null (for skill-type questions)
    textAnswer?: string;             // For text/textarea questions
    selectedOptions?: string[];      // For radio/checkbox questions
    ratingValue?: number;            // For rating questions
    status: 'pending' | 'answered';
    answeredAt?: Date;
    tenantId: string;
    organisationId: string;
}

const QuestionAnswerSchema = new Schema<IQuestionAnswer>(
    {
        questionnaireId: {
            type: String,
            required: true,
            ref: 'Questionnaire',
            index: true,
        },
        questionnaireResponseId: {
            type: String,
            required: true,
            ref: 'QuestionnaireResponse',
            index: true,
        },
        employeeId: {
            type: String,
            required: true,
            ref: 'User',
            index: true,
        },
        questionId: {
            type: String,
            required: true,
            index: true,
        },
        skillLevel: {
            type: Number,
            required: false,
            min: 1,
            max: 5,
        },
        interestLevel: {
            type: Number,
            required: false,
            min: 1,
            max: 5,
        },
        textAnswer: {
            type: String,
            required: false,
            trim: true,
        },
        selectedOptions: {
            type: [String],
            required: false,
        },
        ratingValue: {
            type: Number,
            required: false,
            min: 1,
            max: 5,
        },
        status: {
            type: String,
            enum: ['pending', 'answered'],
            default: 'pending',
            index: true,
        },
        answeredAt: {
            type: Date,
            required: false,
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
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
QuestionAnswerSchema.index({ employeeId: 1, questionnaireResponseId: 1 });
QuestionAnswerSchema.index({ questionnaireResponseId: 1, status: 1 });
QuestionAnswerSchema.index({ employeeId: 1, status: 1 });
QuestionAnswerSchema.index({ 
    questionnaireResponseId: 1, 
    questionId: 1, 
    employeeId: 1 
}, { unique: true }); // Prevent duplicate answers

export const QuestionAnswerModel = model<IQuestionAnswer>(
    'QuestionAnswer',
    QuestionAnswerSchema
);