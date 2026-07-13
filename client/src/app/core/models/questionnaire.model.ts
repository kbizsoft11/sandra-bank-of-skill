export type QuestionType = 
    | 'text'
    | 'textarea'
    | 'radio'
    | 'checkbox'
    | 'rating'
    | 'date';

export type QuestionnaireStatus = 
    | 'draft'
    | 'active'
    | 'archived';

export type ResponseStatus = 
    | 'pending'
    | 'in_progress'
    | 'completed';

export interface Question {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    options?: string[];
    required: boolean;
    order: number;
}

export interface Questionnaire {
    _id: string;
    title: string;
    description: string;
    createdBy: string;
    tenantId: string;
    organisationId: string;
    questions: Question[];
    status: QuestionnaireStatus;
    createdAt: string;
    updatedAt: string;
}

export interface Answer {
    questionId: string;
    answer: string | string[];
}

export interface QuestionnaireResponse {
    _id: string;
    questionnaireId: string;
    employeeId: string;
    assignedBy: string;
    tenantId: string;
    organisationId: string;
    answers: Answer[];
    status: ResponseStatus;
    assignedAt: string;
    deadline?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface QuestionnaireWithResponse extends Questionnaire {
    responseId: string;
    responseStatus: ResponseStatus;
    assignedAt: string;
    deadline?: string;
    completedAt?: string;
}

export interface QuestionnaireResponseWithEmployee extends QuestionnaireResponse {
    employee: {
        _id: string;
        fullName: string;
        email: string;
        department?: string;
    } | null;
}

export interface CreateQuestionnaireDto {
    title: string;
    description: string;
    questions: Omit<Question, 'questionId'>[];
    status?: QuestionnaireStatus;
}

export interface UpdateQuestionnaireDto {
    title?: string;
    description?: string;
    questions?: Question[];
    status?: QuestionnaireStatus;
}

export interface AssignQuestionnaireDto {
    employeeIds: string[];
    deadline?: string;
}

export interface SubmitResponseDto {
    answers: Answer[];
    isComplete: boolean;
}
