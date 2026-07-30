import { Router } from 'express';
import skillUserController from '../controllers/skillUser.controller';
import { validate, validateParams } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import {
  createSkillUserSchema,
  updateSkillUserSchema,
  skillUserIdParamSchema,
} from '../validators/skillUser';

const router = Router();

/**
 * SkillUser Routes
 * Manages user-skill relationships and assessments
 */

// POST: Create/Upsert SkillUser (from questionnaire or manual assessment)
// Body: { userId, skillId, score, level, questionnaireId?, assessmentId? }
router.post(
  '/',
  authenticate,
  validate(createSkillUserSchema),
  skillUserController.upsert
);

// GET: Get user's all skills
// Query: { userId, skip?, limit? }
// Admin sees all, Employee sees own, Manager sees company
router.get(
  '/user/:userId',
  authenticate,
  skillUserController.getByUser
);

// GET: Get skill's all users
// Query: { skillId, skip?, limit? }
// Admin only
router.get(
  '/skill/:skillId',
  authenticate,
  allowRoles('admin'),
  skillUserController.getBySkill
);

// GET: Get specific SkillUser record
// Admin sees all, User sees own
router.get(
  '/:id',
  authenticate,
  validateParams(skillUserIdParamSchema),
  skillUserController.getById
);

// PUT: Update SkillUser (score, level, assessmentId)
// Body: { score?, level?, assessmentId? }
router.put(
  '/:id',
  authenticate,
  validateParams(skillUserIdParamSchema),
  validate(updateSkillUserSchema),
  skillUserController.update
);

// DELETE: Remove SkillUser
// Admin only
router.delete(
  '/:id',
  authenticate,
  allowRoles('admin'),
  validateParams(skillUserIdParamSchema),
  skillUserController.delete
);

// GET: Get skills from a specific questionnaire response
// Query: { questionnaireResponseId }
router.get(
  '/questionnaire/:questionnaireId',
  authenticate,
  skillUserController.getFromQuestionnaire
);

// GET: Get user's skills in enabled categories (for employee profile)
// Query: { userId, companyId }
router.get(
  '/user/:userId/enabled-categories',
  authenticate,
  skillUserController.getInEnabledCategories
);

export default router;
