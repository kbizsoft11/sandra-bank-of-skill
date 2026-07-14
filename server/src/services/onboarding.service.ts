import { QuestionnaireModel } from '../models/questionnaire.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';

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
    // Find all active onboarding questionnaires for this organization
    const onboardingQuestionnaires = await QuestionnaireModel.find({
        tenantId: tenantId,
        organisationId: organisationId,
        status: 'active',
        isOnboardingQuestionnaire: true,
    });

    if (onboardingQuestionnaires.length === 0) {
        // No onboarding questionnaires found, employee can proceed without onboarding
        return;
    }

    // Assign each onboarding questionnaire to the employee
    const assignmentPromises = onboardingQuestionnaires.map(async (questionnaire) => {
        // Check if already assigned (avoid duplicates)
        const existing = await QuestionnaireResponseModel.findOne({
            questionnaireId: questionnaire._id.toString(),
            employeeId: employeeId,
        });

        if (existing) {
            return; // Already assigned, skip
        }

        // Create questionnaire response assignment
        await QuestionnaireResponseModel.create({
            questionnaireId: questionnaire._id.toString(),
            employeeId: employeeId,
            assignedBy: assignedBy,
            tenantId: tenantId,
            organisationId: organisationId,
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
