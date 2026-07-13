import { Router } from 'express';
import * as questionnaireController from '../controllers/questionnaire.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// ==================== COMPANY ROLE ROUTES ====================

/**
 * GET /questionnaires
 * Get all questionnaires for the company
 */
router.get(
    '/',
    authenticate,
    allowRoles('company'),
    questionnaireController.getAllQuestionnaires
);

/**
 * GET /questionnaires/:id
 * Get specific questionnaire by ID
 */
router.get(
    '/:id',
    authenticate,
    allowRoles('company'),
    questionnaireController.getQuestionnaireById
);

/**
 * POST /questionnaires
 * Create a new questionnaire
 */
router.post(
    '/',
    authenticate,
    allowRoles('company'),
    questionnaireController.createQuestionnaire
);

/**
 * PUT /questionnaires/:id
 * Update an existing questionnaire
 */
router.put(
    '/:id',
    authenticate,
    allowRoles('company'),
    questionnaireController.updateQuestionnaire
);

/**
 * DELETE /questionnaires/:id
 * Delete a questionnaire
 */
router.delete(
    '/:id',
    authenticate,
    allowRoles('company'),
    questionnaireController.deleteQuestionnaire
);

/**
 * POST /questionnaires/:id/assign
 * Assign questionnaire to employees
 */
router.post(
    '/:id/assign',
    authenticate,
    allowRoles('company'),
    questionnaireController.assignQuestionnaire
);

/**
 * GET /questionnaires/:id/responses
 * Get all responses for a questionnaire
 */
router.get(
    '/:id/responses',
    authenticate,
    allowRoles('company'),
    questionnaireController.getQuestionnaireResponses
);

// ==================== EMPLOYEE ROLE ROUTES ====================

/**
 * GET /questionnaires/my/assigned
 * Get all questionnaires assigned to the employee
 */
router.get(
    '/my/assigned',
    authenticate,
    allowRoles('employee'),
    questionnaireController.getMyQuestionnaires
);

/**
 * GET /questionnaires/my/:id
 * Get specific questionnaire for employee
 */
router.get(
    '/my/:id',
    authenticate,
    allowRoles('employee'),
    questionnaireController.getQuestionnaireForEmployee
);

/**
 * POST /questionnaires/my/:id/submit
 * Submit questionnaire response
 */
router.post(
    '/my/:id/submit',
    authenticate,
    allowRoles('employee'),
    questionnaireController.submitQuestionnaireResponse
);

export default router;
