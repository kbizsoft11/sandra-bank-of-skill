import { Request, Response } from 'express';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { UserModel } from '../models/user.model';
import { SkillCategory } from '../models/skillCategory.model';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import {
    initializeQuestionAnswers,
    getPendingQuestions,
    getAnsweredQuestions,
    saveQuestionAnswer,
    getQuestionnaireProgress,
    resetQuestionnaireResponse,
} from '../services/question-answer.service';

/**
 * Get all assigned questionnaires for the logged-in employee
 */
export const getAssignedQuestionnaires = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;

        let responses = await QuestionnaireResponseModel.find({
            employeeId: user.userId,
        }).sort({ assignedAt: -1 }).lean();

        if (responses.length === 0 && user.role === 'employee') {
            const dbUser = await UserModel.findById(user.userId).lean();
            const tenantId = user.tenantId || dbUser?.tenantId;
            const organisationId = user.organisationId || dbUser?.organisationId || tenantId;

            if (tenantId && organisationId) {
                try {
                    const { assignOnboardingQuestionnaires } = require('../services/onboarding.service');
                    await assignOnboardingQuestionnaires(
                        user.userId,
                        tenantId,
                        organisationId,
                        organisationId
                    );

                    responses = await QuestionnaireResponseModel.find({
                        employeeId: user.userId,
                    }).sort({ assignedAt: -1 }).lean();
                } catch (err) {
                    console.error('Error auto-assigning onboarding questionnaires in getAssignedQuestionnaires:', err);
                }
            }
        }

        if (responses.length === 0) {
            return sendResponse(
                res,
                200,
                'No questionnaires assigned',
                []
            );
        }

        // Get questionnaire details and progress for each
        const questionnaireIds = responses.map(r => r.questionnaireId);
        const questionnaires = await QuestionnaireModel.find({
            _id: { $in: questionnaireIds },
        }).lean();

        const categoryIds = Array.from(
            new Set(
                questionnaires
                    .filter(q => q.skillCategoryId)
                    .map(q => q.skillCategoryId as string)
            )
        );

        const categories = categoryIds.length > 0
            ? await SkillCategory.find({ _id: { $in: categoryIds } }).lean()
            : [];

        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.cat_name]));

        const questionnaireMap = new Map(
            questionnaires.map(q => [q._id.toString(), q])
        );

        const result = await Promise.all(
            responses.map(async (response) => {
                const questionnaire = questionnaireMap.get(response.questionnaireId);
                
                if (!questionnaire) {
                    return null;
                }

                // Get progress
                const progress = await getQuestionnaireProgress(
                    response._id.toString(),
                    user.userId
                );

                return {
                    _id: questionnaire._id,
                    title: questionnaire.title,
                    description: questionnaire.description,
                    categoryId: questionnaire.skillCategoryId,
                    categoryTitle: questionnaire.skillCategoryId
                        ? categoryMap.get(questionnaire.skillCategoryId as string)
                        : undefined,
                    responseId: response._id,
                    status: response.status,
                    assignedAt: response.assignedAt,
                    deadline: response.deadline,
                    completedAt: response.completedAt,
                    isOnboarding: questionnaire.isOnboardingQuestionnaire,
                    progress,
                };
            })
        );

        const filteredResult = result.filter(r => r !== null);

        return sendResponse(
            res,
            200,
            'Assigned questionnaires fetched successfully',
            filteredResult
        );
    }
);

/**
 * Start or resume a questionnaire
 * Returns questionnaire details and pending questions
 */
export const startQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { responseId } = req.params;

        const response = await QuestionnaireResponseModel.findOne({
            _id: responseId,
            employeeId: user.userId,
        });

        if (!response) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found or not assigned to you',
                null
            );
        }

        let questionnaire = await QuestionnaireModel.findById(response.questionnaireId);

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        // Keep the questionnaire title intact, but preserve category metadata
        const categoryMeta = questionnaire.skillCategoryId
            ? await SkillCategory.findById(questionnaire.skillCategoryId).lean()
            : null;

        // Initialize question answers if not already done
        await initializeQuestionAnswers(
            response._id.toString(),
            response.questionnaireId,
            user.userId,
            user.tenantId,
            user.organisationId
        );

        // Get pending and answered questions
        const pendingQuestions = await getPendingQuestions(
            response._id.toString(),
            user.userId
        );

        const answeredQuestions = await getAnsweredQuestions(
            response._id.toString(),
            user.userId
        );

        // Map question details from questionnaire
        const questionMap = new Map(
            questionnaire.questions.map(q => [q.questionId, q])
        );

        const pendingWithDetails = pendingQuestions.map(pq => {
            const questionDetails = questionMap.get(pq.questionId);
            const pqObj = (pq as any).toObject?.() || pq;
            return {
                ...pqObj,
                questionText: questionDetails?.questionText,
                questionType: questionDetails?.questionType,
                skillDescription: questionDetails?.skillDescription,
                options: questionDetails?.options,
                required: questionDetails?.required,
                order: questionDetails?.order,
            };
        });

        const answeredWithDetails = answeredQuestions.map(aq => {
            const questionDetails = questionMap.get(aq.questionId);
            const aqObj = (aq as any).toObject?.() || aq;
            return {
                ...aqObj,
                questionText: questionDetails?.questionText,
                questionType: questionDetails?.questionType,
                skillDescription: questionDetails?.skillDescription,
            };
        });

        // Get progress
        const progress = await getQuestionnaireProgress(
            response._id.toString(),
            user.userId
        );

        return sendResponse(
            res,
            200,
            'Questionnaire started successfully',
            {
                questionnaire: {
                    _id: questionnaire._id,
                    title: questionnaire.title,
                    description: questionnaire.description,
                    isOnboarding: questionnaire.isOnboardingQuestionnaire,
                },
                responseId: response._id,
                status: response.status,
                pendingQuestions: pendingWithDetails,
                answeredQuestions: answeredWithDetails,
                progress,
            }
        );
    }
);

/**
 * Save answer for a single question
 */
export const saveAnswer = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { responseId, questionId } = req.params;
        const responseIdStr = Array.isArray(responseId) ? responseId[0] : responseId;
        const questionIdStr = Array.isArray(questionId) ? questionId[0] : questionId;
        const answerData = req.body;

        // Validate response belongs to user
        const response = await QuestionnaireResponseModel.findOne({
            _id: responseIdStr,
            employeeId: user.userId,
        });

        if (!response) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found or not assigned to you',
                null
            );
        }

        // Save the answer
        const savedAnswer = await saveQuestionAnswer(
            responseIdStr,
            user.userId,
            questionIdStr,
            answerData
        );

        // Get updated progress
        const progress = await getQuestionnaireProgress(
            responseIdStr,
            user.userId
        );

        // Get updated response status
        const updatedResponse = await QuestionnaireResponseModel.findById(responseIdStr);

        return sendResponse(
            res,
            200,
            'Answer saved successfully',
            {
                answer: savedAnswer,
                progress,
                responseStatus: updatedResponse?.status,
            }
        );
    }
);

/**
 * Get questionnaire progress
 */
export const getProgress = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { responseId } = req.params;
        const responseIdStr = Array.isArray(responseId) ? responseId[0] : responseId;

        const response = await QuestionnaireResponseModel.findOne({
            _id: responseIdStr,
            employeeId: user.userId,
        });

        if (!response) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found or not assigned to you',
                null
            );
        }

        const progress = await getQuestionnaireProgress(
            responseIdStr,
            user.userId
        );

        return sendResponse(
            res,
            200,
            'Progress fetched successfully',
            progress
        );
    }
);

/**
 * Reset a completed questionnaire so the employee can retake it
 */
export const retakeQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { responseId } = req.params;
        const responseIdStr = Array.isArray(responseId) ? responseId[0] : responseId;

        const response = await QuestionnaireResponseModel.findOne({
            _id: responseIdStr,
            employeeId: user.userId,
        });

        if (!response) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found or not assigned to you',
                null
            );
        }

        await resetQuestionnaireResponse(
            responseIdStr,
            user.userId,
            response.tenantId,
            response.organisationId
        );

        return sendResponse(
            res,
            200,
            'Questionnaire reset successfully',
            {
                responseId: responseIdStr,
                status: 'pending',
            }
        );
    }
);