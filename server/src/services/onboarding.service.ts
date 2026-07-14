import { QuestionnaireModel } from '../models/questionnaire.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { UserModel } from '../models/user.model';

/**
 * Assign a questionnaire to a list of employees (or all employees in a company if none are provided)
 */
export const assignQuestionnaireToCompanyEmployees = async (
    questionnaireId: string,
    tenantId: string,
    organisationId: string,
    assignedBy: string,
    employeeIds?: string[]
): Promise<void> => {
    const targetEmployeeIds = employeeIds?.length
        ? employeeIds
        : (await UserModel.find({
            tenantId,
            organisationId,
            role: 'employee',
        }).select('_id')).map((user) => user._id.toString());

    if (targetEmployeeIds.length === 0) {
        return;
    }

    const assignmentPromises = targetEmployeeIds.map(async (employeeId: string) => {
        const existing = await QuestionnaireResponseModel.findOne({
            questionnaireId,
            employeeId,
        });

        if (existing) {
            return;
        }

        await QuestionnaireResponseModel.create({
            questionnaireId,
            employeeId,
            assignedBy,
            tenantId,
            organisationId,
            status: 'pending',
            assignedAt: new Date(),
        });
    });

    await Promise.all(assignmentPromises);
};

/**
 * Auto-assign onboarding questionnaires to a new employee
 * Called when an employee is invited or joins the company
 */
export const assignOnboardingQuestionnaires = async (
    employeeId: string,
    tenantId: string,
    organisationId: string,
    assignedBy: string
): Promise<void> => {
    const onboardingQuestionnaires = await QuestionnaireModel.find({
        tenantId,
        organisationId,
        status: 'active',
        isOnboardingQuestionnaire: true,
    });

    if (onboardingQuestionnaires.length === 0) {
        return;
    }

    const assignmentPromises = onboardingQuestionnaires.map(async (questionnaire) => {
        const existing = await QuestionnaireResponseModel.findOne({
            questionnaireId: questionnaire._id.toString(),
            employeeId,
        });

        if (existing) {
            return;
        }

        await QuestionnaireResponseModel.create({
            questionnaireId: questionnaire._id.toString(),
            employeeId,
            assignedBy,
            tenantId,
            organisationId,
            status: 'pending',
            assignedAt: new Date(),
        });
    });

    await Promise.all(assignmentPromises);
};

/**
 * Check if employee has any pending onboarding questionnaires
 */
export const hasPendingOnboardingQuestionnaire = async (
    employeeId: string
): Promise<boolean> => {
    const pendingResponse = await QuestionnaireResponseModel.findOne({
        employeeId: employeeId,
        status: { $in: ['pending', 'in_progress'] },
    }).populate('questionnaireId');

    if (!pendingResponse) {
        return false;
    }

    // Check if the questionnaire is an onboarding questionnaire
    const questionnaire = await QuestionnaireModel.findById(
        pendingResponse.questionnaireId
    );

    return questionnaire?.isOnboardingQuestionnaire || false;
};

/**
 * Get pending onboarding questionnaire for an employee
 */
export const getPendingOnboardingQuestionnaire = async (
    employeeId: string
) => {
    // Find pending onboarding questionnaire response
    const response = await QuestionnaireResponseModel.findOne({
        employeeId: employeeId,
        status: { $in: ['pending', 'in_progress'] },
    }).sort({ assignedAt: 1 }); // Get the oldest pending one first

    if (!response) {
        return null;
    }

    // Get the questionnaire details
    const questionnaire = await QuestionnaireModel.findById(
        response.questionnaireId
    );

    if (!questionnaire || !questionnaire.isOnboardingQuestionnaire) {
        return null;
    }

    return {
        questionnaire,
        response,
    };
};
