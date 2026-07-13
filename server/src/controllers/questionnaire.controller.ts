import { Request, Response } from 'express';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { UserModel } from '../models/user.model';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { v4 as uuidv4 } from 'uuid';

// ==================== COMPANY ROLE CONTROLLERS ====================

/**
 * Get all questionnaires for the company user
 * Only returns questionnaires from their organization
 */
export const getAllQuestionnaires = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        
        const questionnaires = await QuestionnaireModel.find({
            tenantId: user.tenantId,
            organisationId: user.organisationId,
        })
        .sort({ createdAt: -1 })
        .lean();

        return sendResponse(
            res,
            200,
            'Questionnaires fetched successfully',
            questionnaires
        );
    }
);

/**
 * Get single questionnaire by ID
 */
export const getQuestionnaireById = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;

        const questionnaire = await QuestionnaireModel.findOne({
            _id: id,
            tenantId: user.tenantId,
            organisationId: user.organisationId,
        });

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        return sendResponse(
            res,
            200,
            'Questionnaire fetched successfully',
            questionnaire
        );
    }
);

/**
 * Create a new questionnaire
 */
export const createQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { title, description, questions, status } = req.body;

        // Validate user has required fields
        if (!user.userId) {
            return sendResponse(
                res,
                401,
                'Invalid user authentication',
                null
            );
        }

        // Fetch fresh user data from database to get organisationId if missing from token
        let organisationId = user.organisationId;
        let tenantId = user.tenantId;

        if (!organisationId || !tenantId) {
            const dbUser = await UserModel.findById(user.userId);
            
            if (!dbUser) {
                return sendResponse(
                    res,
                    401,
                    'User not found',
                    null
                );
            }

            organisationId = organisationId || dbUser.organisationId;
            tenantId = tenantId || dbUser.tenantId;
        }

        if (!tenantId) {
            return sendResponse(
                res,
                400,
                'User does not have a tenant assigned. Please contact your administrator.',
                null
            );
        }

        if (!organisationId) {
            return sendResponse(
                res,
                400,
                'User does not have an organization assigned. Please complete your profile setup or login again.',
                null
            );
        }

        // Validate questions
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return sendResponse(
                res,
                400,
                'At least one question is required',
                null
            );
        }

        // Assign unique IDs to questions
        const questionsWithIds = questions.map((q: any, index: number) => ({
            questionId: uuidv4(),
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || [],
            required: q.required !== undefined ? q.required : true,
            order: index,
        }));

        const questionnaire = await QuestionnaireModel.create({
            title,
            description,
            createdBy: user.userId,
            tenantId: tenantId,
            organisationId: organisationId,
            questions: questionsWithIds,
            status: status || 'draft',
        });

        return sendResponse(
            res,
            201,
            'Questionnaire created successfully',
            questionnaire
        );
    }
);

/**
 * Update an existing questionnaire
 */
export const updateQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;
        const { title, description, questions, status } = req.body;

        const questionnaire = await QuestionnaireModel.findOne({
            _id: id,
            tenantId: user.tenantId,
            organisationId: user.organisationId,
        });

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        // Update fields
        if (title) questionnaire.title = title;
        if (description) questionnaire.description = description;
        if (status) questionnaire.status = status;
        
        if (questions && Array.isArray(questions)) {
            // Preserve existing questionIds where possible, assign new ones for new questions
            const questionsWithIds = questions.map((q: any, index: number) => ({
                questionId: q.questionId || uuidv4(),
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options || [],
                required: q.required !== undefined ? q.required : true,
                order: index,
            }));
            questionnaire.questions = questionsWithIds;
        }

        await questionnaire.save();

        return sendResponse(
            res,
            200,
            'Questionnaire updated successfully',
            questionnaire
        );
    }
);

/**
 * Delete a questionnaire
 */
export const deleteQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;

        const questionnaire = await QuestionnaireModel.findOneAndDelete({
            _id: id,
            tenantId: user.tenantId,
            organisationId: user.organisationId,
        });

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        // Also delete all associated responses
        await QuestionnaireResponseModel.deleteMany({
            questionnaireId: id as string,
        });

        return sendResponse(
            res,
            200,
            'Questionnaire deleted successfully',
            null
        );
    }
);

/**
 * Assign questionnaire to employees
 */
export const assignQuestionnaire = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;
        const { employeeIds, deadline } = req.body;

        // Validate input
        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(
                res,
                400,
                'At least one employee ID is required',
                null
            );
        }

        // Verify questionnaire exists and belongs to user's organization
        const questionnaire = await QuestionnaireModel.findOne({
            _id: id,
            tenantId: user.tenantId,
            organisationId: user.organisationId,
            status: 'active', // Can only assign active questionnaires
        });

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found or not active',
                null
            );
        }

        // Verify all employees belong to the same organization
        const employees = await UserModel.find({
            _id: { $in: employeeIds },
            tenantId: user.tenantId,
            organisationId: user.organisationId,
            role: 'employee',
        });

        if (employees.length !== employeeIds.length) {
            return sendResponse(
                res,
                400,
                'One or more employee IDs are invalid',
                null
            );
        }

        // Create response records for each employee
        const assignmentPromises = employeeIds.map(async (employeeId: string) => {
            // Check if already assigned
            const existing = await QuestionnaireResponseModel.findOne({
                questionnaireId: id as string,
                employeeId: employeeId,
            });

            if (existing) {
                return { employeeId, status: 'already_assigned' };
            }

            await QuestionnaireResponseModel.create({
                questionnaireId: id as string,
                employeeId: employeeId,
                assignedBy: user.userId,
                tenantId: user.tenantId,
                organisationId: user.organisationId,
                deadline: deadline ? new Date(deadline) : undefined,
                status: 'pending',
            });

            return { employeeId, status: 'assigned' };
        });

        const results = await Promise.all(assignmentPromises);

        return sendResponse(
            res,
            200,
            'Questionnaire assigned successfully',
            { results }
        );
    }
);

/**
 * Get all responses for a specific questionnaire
 */
export const getQuestionnaireResponses = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;

        // Verify questionnaire belongs to user's organization
        const questionnaire = await QuestionnaireModel.findOne({
            _id: id,
            tenantId: user.tenantId,
            organisationId: user.organisationId,
        });

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        // Get all responses with employee details
        const responses = await QuestionnaireResponseModel.find({
            questionnaireId: id as string,
        })
        .sort({ assignedAt: -1 })
        .lean();

        // Populate employee information
        const employeeIds = responses.map(r => r.employeeId);
        const employees = await UserModel.find({
            _id: { $in: employeeIds },
        }).select('fullName email department');

        const employeeMap = new Map(
            employees.map(emp => [emp._id.toString(), emp])
        );

        const responsesWithEmployeeInfo = responses.map(response => ({
            ...response,
            employee: employeeMap.get(response.employeeId) || null,
        }));

        return sendResponse(
            res,
            200,
            'Questionnaire responses fetched successfully',
            {
                questionnaire,
                responses: responsesWithEmployeeInfo,
            }
        );
    }
);

// ==================== EMPLOYEE ROLE CONTROLLERS ====================

/**
 * Get all questionnaires assigned to the employee
 */
export const getMyQuestionnaires = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;

        const responses = await QuestionnaireResponseModel.find({
            employeeId: user.userId,
        })
        .sort({ assignedAt: -1 })
        .lean();

        // Get questionnaire details
        const questionnaireIds = responses.map(r => r.questionnaireId);
        const questionnaires = await QuestionnaireModel.find({
            _id: { $in: questionnaireIds as string[] },
        }).lean();

        const questionnaireMap = new Map(
            questionnaires.map(q => [q._id.toString(), q])
        );

        const questionnairesWithStatus = responses.map(response => {
            const questionnaire = questionnaireMap.get(response.questionnaireId);
            return {
                ...questionnaire,
                responseId: response._id,
                responseStatus: response.status,
                assignedAt: response.assignedAt,
                deadline: response.deadline,
                completedAt: response.completedAt,
            };
        });

        return sendResponse(
            res,
            200,
            'Questionnaires fetched successfully',
            questionnairesWithStatus
        );
    }
);

/**
 * Get specific questionnaire details for employee
 */
export const getQuestionnaireForEmployee = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;

        const response = await QuestionnaireResponseModel.findOne({
            questionnaireId: id,
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

        const questionnaire = await QuestionnaireModel.findById(id);

        if (!questionnaire) {
            return sendResponse(
                res,
                404,
                'Questionnaire not found',
                null
            );
        }

        return sendResponse(
            res,
            200,
            'Questionnaire fetched successfully',
            {
                questionnaire,
                response,
            }
        );
    }
);

/**
 * Submit questionnaire response (complete or partial save)
 */
export const submitQuestionnaireResponse = asyncHandler(
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { id } = req.params;
        const { answers, isComplete } = req.body;

        const response = await QuestionnaireResponseModel.findOne({
            questionnaireId: id,
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

        // Update answers
        if (answers && Array.isArray(answers)) {
            response.answers = answers;
        }

        // Update status
        if (isComplete) {
            response.status = 'completed';
            response.completedAt = new Date();
        } else if (response.status === 'pending') {
            response.status = 'in_progress';
            response.startedAt = new Date();
        }

        await response.save();

        return sendResponse(
            res,
            200,
            isComplete ? 'Questionnaire submitted successfully' : 'Progress saved successfully',
            response
        );
    }
);
