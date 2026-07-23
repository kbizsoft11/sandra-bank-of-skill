import { QuestionnaireModel } from '../models/questionnaire.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import { UserModel } from '../models/user.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * Static default onboarding questions for all employees
 * These are skill assessment questions with dual rating scales
 */
const getDefaultOnboardingQuestions = () => [
    {
        questionId: uuidv4(),
        questionText: 'Corrective and preventive action management',
        questionType: 'textarea' as const,
        options: [],
        required: true,
        order: 0,
    },
    {
        questionId: uuidv4(),
        questionText: 'Quality Management Systems',
        questionType: 'textarea' as const,
        options: [],
        required: true,
        order: 1,
    },
    {
        questionId: uuidv4(),
        questionText: 'Process Improvement',
        questionType: 'textarea' as const,
        options: [],
        required: true,
        order: 2,
    },
    {
        questionId: uuidv4(),
        questionText: 'What do you hope to achieve in your first 90 days?',
        questionType: 'textarea' as const,
        options: [],
        required: true,
        order: 4,
    },
    {
        questionId: uuidv4(),
        questionText: 'How would you rate your current proficiency level in your role?',
        questionType: 'rating' as const,
        options: [],
        required: true,
        order: 5,
    },
    {
        questionId: uuidv4(),
        questionText: 'What type of learning style works best for you?',
        questionType: 'radio' as const,
        options: [
            'Visual (diagrams, charts, videos)',
            'Auditory (discussions, podcasts)',
            'Reading/Writing (documentation, articles)',
            'Hands-on (practical exercises, projects)',
            'Combination of all'
        ],
        required: true,
        order: 6,
    },
    {
        questionId: uuidv4(),
        questionText: 'What are your career goals for the next year?',
        questionType: 'textarea' as const,
        options: [],
        required: true,
        order: 7,
    }
];

/**
 * Create or get the default onboarding questionnaire for a company
 * This ensures every company has a standard onboarding questionnaire
 */
export const ensureDefaultOnboardingQuestionnaire = async (
    tenantId: string,
    organisationId: string,
    createdBy: string
): Promise<string> => {
    // Check if default un-targeted onboarding questionnaire already exists
    const existing = await QuestionnaireModel.findOne({
        tenantId,
        organisationId,
        isOnboardingQuestionnaire: true,
        status: 'active',
        $or: [
            { targetDesignationId: { $exists: false } },
            { targetDesignationId: null },
            { targetDesignationId: '' },
        ],
    });

    if (existing) {
        console.log('?? Default onboarding questionnaire already exists:', existing._id);
        return existing._id.toString();
    }

    // Create new default onboarding questionnaire
    const questionnaire = await QuestionnaireModel.create({
        title: 'Employee Onboarding Questionnaire',
        description: 'Welcome to our team! This questionnaire helps us understand your background, goals, and learning preferences so we can support your success from day one.',
        createdBy,
        tenantId,
        organisationId,
        questions: getDefaultOnboardingQuestions(),
        status: 'active',
        isOnboardingQuestionnaire: true,
    });

    console.log('?? Created new default onboarding questionnaire:', questionnaire._id);
    return questionnaire._id.toString();
};

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
    const { initializeQuestionAnswers } = require('./question-answer.service');
    
    let targetEmployeeIds: string[] = [];
    if (employeeIds?.length) {
        targetEmployeeIds = employeeIds;
    } else {
        const questionnaire = await QuestionnaireModel.findById(questionnaireId).lean();
        const employeeFilter: any = {
            tenantId,
            organisationId,
            role: 'employee',
        };
        if (questionnaire?.targetDesignationId) {
            employeeFilter.designationId = questionnaire.targetDesignationId;
        }
        const employees = await UserModel.find(employeeFilter).select('_id').lean();
        targetEmployeeIds = employees.map((user) => user._id.toString());
    }

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

        const response = await QuestionnaireResponseModel.create({
            questionnaireId,
            employeeId,
            assignedBy,
            tenantId,
            organisationId,
            status: 'pending',
            assignedAt: new Date(),
        });

        // Initialize question answers
        await initializeQuestionAnswers(
            response._id.toString(),
            questionnaireId,
            employeeId,
            tenantId,
            organisationId
        );
    });

    await Promise.all(assignmentPromises);
};

/**
 * Auto-assign onboarding questionnaires to a new employee
 * Called when an employee is invited or joins the company
 * Ensures default onboarding questionnaire exists before assigning
 */
export const assignOnboardingQuestionnaires = async (
    employeeId: string,
    tenantId: string,
    organisationId: string,
    assignedBy: string
): Promise<void> => {
    const { initializeQuestionAnswers } = require('./question-answer.service');
    
    // First, ensure the default onboarding questionnaire exists
    await ensureDefaultOnboardingQuestionnaire(tenantId, organisationId, assignedBy);

    // Get employee details to check designationId for role-based matching
    const employee = await UserModel.findById(employeeId).lean();
    const employeeDesignationId = employee?.designationId ? employee.designationId.toString() : null;

    // Now find all active onboarding questionnaires for this organization
    const allOnboardingQuestionnaires = await QuestionnaireModel.find({
        tenantId,
        organisationId,
        status: 'active',
        isOnboardingQuestionnaire: true,
    }).lean();

    // Filter questionnaires according to the employee's role/designation
    let onboardingQuestionnaires = allOnboardingQuestionnaires.filter((q) => {
        // If questionnaire has no specific target designation, it applies to all roles
        if (!q.targetDesignationId) return true;
        // If questionnaire specifies a target designation, it must match employee's designationId
        return employeeDesignationId && q.targetDesignationId.toString() === employeeDesignationId;
    });

    // Fallback: If no role-specific or general onboarding questionnaire matched, use all active onboarding questionnaires
    if (onboardingQuestionnaires.length === 0 && allOnboardingQuestionnaires.length > 0) {
        onboardingQuestionnaires = allOnboardingQuestionnaires;
    }

    if (onboardingQuestionnaires.length === 0) {
        console.warn('?? No onboarding questionnaires found after ensuring default');
        return;
    }

    console.log(`?? Found ${onboardingQuestionnaires.length} onboarding questionnaire(s) to assign`);

    const assignmentPromises = onboardingQuestionnaires.map(async (questionnaire) => {
        const existing = await QuestionnaireResponseModel.findOne({
            questionnaireId: questionnaire._id.toString(),
            employeeId,
        });

        if (existing) {
            console.log(`?? Questionnaire ${questionnaire._id} already assigned to employee ${employeeId}`);
            return;
        }

        const response = await QuestionnaireResponseModel.create({
            questionnaireId: questionnaire._id.toString(),
            employeeId,
            assignedBy,
            tenantId,
            organisationId,
            status: 'pending',
            assignedAt: new Date(),
        });

        // Initialize question answers
        await initializeQuestionAnswers(
            response._id.toString(),
            questionnaire._id.toString(),
            employeeId,
            tenantId,
            organisationId
        );

        console.log(`?? Assigned questionnaire ${questionnaire._id} to employee ${employeeId}`);
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
