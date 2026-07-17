import { QuestionAnswerModel, IQuestionAnswer } from '../models/question-answer.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { UserModel } from '../models/user.model';

/**
 * Initialize question answers for a questionnaire response
 * Creates pending answer records for all questions
 */
export const initializeQuestionAnswers = async (
    questionnaireResponseId: string,
    questionnaireId: string,
    employeeId: string,
    tenantId: string,
    organisationId: string
): Promise<void> => {
    // Get all questions from the questionnaire
    const questionnaire = await QuestionnaireModel.findById(questionnaireId);
    
    if (!questionnaire) {
        throw new Error('Questionnaire not found');
    }

    // Check if answers already initialized
    const existingCount = await QuestionAnswerModel.countDocuments({
        questionnaireResponseId,
        employeeId,
    });

    if (existingCount > 0) {
        console.log(`📋 Answers already initialized for response ${questionnaireResponseId}`);
        return;
    }

    // Create pending answer record for each question
    const answerRecords = questionnaire.questions.map(question => ({
        questionnaireId,
        questionnaireResponseId,
        employeeId,
        questionId: question.questionId,
        status: 'pending' as const,
        tenantId,
        organisationId,
    }));

    await QuestionAnswerModel.insertMany(answerRecords);
    console.log(`📋 Initialized ${answerRecords.length} question answers for response ${questionnaireResponseId}`);
};

/**
 * Get pending questions for an employee's questionnaire
 */
export const getPendingQuestions = async (
    questionnaireResponseId: string,
    employeeId: string
): Promise<IQuestionAnswer[]> => {
    return await QuestionAnswerModel.find({
        questionnaireResponseId,
        employeeId,
        status: 'pending',
    }).sort({ createdAt: 1 });
};

/**
 * Get answered questions for an employee's questionnaire
 */
export const getAnsweredQuestions = async (
    questionnaireResponseId: string,
    employeeId: string
): Promise<IQuestionAnswer[]> => {
    return await QuestionAnswerModel.find({
        questionnaireResponseId,
        employeeId,
        status: 'answered',
    }).sort({ answeredAt: 1 });
};

/**
 * Save a single question answer
 */
export const saveQuestionAnswer = async (
    questionnaireResponseId: string,
    employeeId: string,
    questionId: string,
    answerData: {
        skillLevel?: number | null;
        interestLevel?: number | null;
        textAnswer?: string;
        selectedOptions?: string[];
        ratingValue?: number;
    }
): Promise<IQuestionAnswer> => {
    // Find existing answer record
    const answer = await QuestionAnswerModel.findOne({
        questionnaireResponseId,
        employeeId,
        questionId,
    });

    if (!answer) {
        throw new Error('Question answer record not found');
    }

    // Update the answer
    answer.skillLevel = answerData.skillLevel !== undefined ? answerData.skillLevel : answer.skillLevel;
    answer.interestLevel = answerData.interestLevel !== undefined ? answerData.interestLevel : answer.interestLevel;
    answer.textAnswer = answerData.textAnswer !== undefined ? answerData.textAnswer : answer.textAnswer;
    answer.selectedOptions = answerData.selectedOptions !== undefined ? answerData.selectedOptions : answer.selectedOptions;
    answer.ratingValue = answerData.ratingValue !== undefined ? answerData.ratingValue : answer.ratingValue;
    answer.status = 'answered';
    answer.answeredAt = new Date();

    await answer.save();

    // Update questionnaire response status
    await updateQuestionnaireResponseStatus(questionnaireResponseId, employeeId);

    return answer;
};

/**
 * Update questionnaire response status based on answered questions
 */
export const updateQuestionnaireResponseStatus = async (
    questionnaireResponseId: string,
    employeeId: string
): Promise<void> => {
    const response = await QuestionnaireResponseModel.findById(questionnaireResponseId);
    
    if (!response) {
        return;
    }

    // Count total and answered questions
    const totalCount = await QuestionAnswerModel.countDocuments({
        questionnaireResponseId,
        employeeId,
    });

    const answeredCount = await QuestionAnswerModel.countDocuments({
        questionnaireResponseId,
        employeeId,
        status: 'answered',
    });

    // Update response status
    if (answeredCount === 0) {
        response.status = 'pending';
    } else if (answeredCount < totalCount) {
        response.status = 'in_progress';
        if (!response.startedAt) {
            response.startedAt = new Date();
        }
    } else {
        response.status = 'completed';
        response.completedAt = new Date();

        // Update employee profile completion status
        await updateEmployeeProfileCompletion(employeeId);
    }

    await response.save();
};

/**
 * Check if employee has completed all assigned questionnaires
 * and update profileCompleted status accordingly
 */
export const updateEmployeeProfileCompletion = async (
    employeeId: string
): Promise<void> => {
    // Get all questionnaire responses for employee
    const allResponses = await QuestionnaireResponseModel.find({
        employeeId,
    });

    if (allResponses.length === 0) {
        return;
    }

    // Check if all are completed
    const allCompleted = allResponses.every(r => r.status === 'completed');

    if (allCompleted) {
        await UserModel.findByIdAndUpdate(employeeId, {
            profileCompleted: true,
            hasCompletedOnboarding: true,
        });
        console.log(`✅ Employee ${employeeId} has completed all questionnaires. Profile marked as complete.`);
    } else {
        await UserModel.findByIdAndUpdate(employeeId, {
            profileCompleted: false,
        });
    }
};

/**
 * Get questionnaire progress for an employee
 */
export const getQuestionnaireProgress = async (
    questionnaireResponseId: string,
    employeeId: string
): Promise<{
    total: number;
    answered: number;
    pending: number;
    percentComplete: number;
}> => {
    const totalCount = await QuestionAnswerModel.countDocuments({
        questionnaireResponseId,
        employeeId,
    });

    const answeredCount = await QuestionAnswerModel.countDocuments({
        questionnaireResponseId,
        employeeId,
        status: 'answered',
    });

    const pendingCount = totalCount - answeredCount;
    const percentComplete = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

    return {
        total: totalCount,
        answered: answeredCount,
        pending: pendingCount,
        percentComplete,
    };
};

/**
 * Delete all question answers for a questionnaire response
 */
export const deleteQuestionAnswers = async (
    questionnaireResponseId: string
): Promise<void> => {
    await QuestionAnswerModel.deleteMany({
        questionnaireResponseId,
    });
};