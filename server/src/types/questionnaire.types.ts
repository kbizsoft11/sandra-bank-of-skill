import { Document } from "mongoose";

export type QuestionType = 
    | 'text'           // Short text answer
    | 'textarea'       // Long text answer
    | 'radio'          // Single choice
    | 'checkbox'       // Multiple choice
    | 'rating'         // Rating scale (1-5)
    | 'date'           // Date picker
    | 'skill';         // Dual rating scale (skill level + interest level)

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
    skillDescription?: string; // For skill type questions - detailed description
}

export interface IQuestionnaire extends Document {
    title: string;
    description: string;
    createdBy: string;         // User ID of creator (company role)
    tenantId: string;          // Organization tenant ID
    organisationId: string;    // Organisation ID
    questions: IQuestion[];
    status: QuestionnaireStatus;
    isOnboardingQuestionnaire: boolean; // Auto-assign to new employees
    createdAt: Date;
    updatedAt: Date;
}

export interface IAnswer {
    questionId: string;
    answer: string | string[] | Record<string, any>; // Support skill answers with objects
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