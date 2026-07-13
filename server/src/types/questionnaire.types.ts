import { Document } from "mongoose";

export type QuestionType = 
    | 'text'           // Short text answer
    | 'textarea'       // Long text answer
    | 'radio'          // Single choice
    | 'checkbox'       // Multiple choice
    | 'rating'         // Rating scale (1-5)
    | 'date';          // Date picker

export type QuestionnaireStatus = 
    | 'draft'          // Being created/edited
    | 'active'         // Published and can be assigned
    | 'archived';      // No longer active

export type ResponseStatus = 
    | 'pending'        // Assigned but not started
    | 'in_progress'    // Started but not completed
    | 'completed';     // Submitted

export interface IQuestion {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    options?: string[];        // For radio/checkbox types
    required: boolean;
    order: number;             // Display order
}

export interface IQuestionnaire extends Document {
    title: string;
    description: string;
    createdBy: string;         // User ID of creator (company role)
    tenantId: string;          // Organization tenant ID
    organisationId: string;    // Organisation ID
    questions: IQuestion[];
    status: QuestionnaireStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IAnswer {
    questionId: string;
    answer: string | string[]; // Single value or array for checkboxes
}

export interface IQuestionnaireResponse extends Document {
    questionnaireId: string;   // Reference to questionnaire
    employeeId: string;        // User ID of employee responding
    assignedBy: string;        // User ID of company user who assigned
    tenantId: string;          // Organization tenant ID
    organisationId: string;    // Organisation ID
    answers: IAnswer[];
    status: ResponseStatus;
    assignedAt: Date;
    deadline?: Date;           // Optional deadline
    startedAt?: Date;          // When employee started filling
    completedAt?: Date;        // When employee submitted
    createdAt: Date;
    updatedAt: Date;
}
