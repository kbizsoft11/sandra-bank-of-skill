import { Router } from "express";

import skillController from "../controllers/skill.controller";
import { validate, validateParams } from "../middlewares/validate.middleware";
import { validateQuery } from "../middlewares/validate-query.middleware";
import { allowRoles } from "../middlewares/role.middleware";
import { authenticate } from "../middlewares/auth.middleware";

import {
  createSkillSchema,
  updateSkillSchema,
  skillIdParamSchema,
  archiveSkillSchema,
} from "../validators/skill";

// Query schemas for backwards compatibility
import { z } from "zod";

const getSkillsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const bulkAssignSchema = z.object({
  skillIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid skill id."))
    .min(1, "At least one skill must be selected."),
  targetCategoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid target category id."),
});

const bulkRemoveSchema = z.object({
  skillIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid skill id."))
    .min(1, "At least one skill must be selected."),
});

const bulkArchiveSchema = z.object({
  skillIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid skill id."))
    .min(1, "At least one skill must be selected."),
  archived: z.boolean().default(true),
});

const bulkStatusSchema = z.object({
  skillIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid skill id."))
    .min(1, "At least one skill must be selected."),
  status: z.enum(['active', 'inactive']).describe("Status to set for skills"),
});

const router = Router();

// Admin can manage all skills, employees can manage their own
router.post(
  "/",
  authenticate,
  validate(createSkillSchema),
  skillController.create
);

// Admin sees all skills, company sees their org's skills, employee sees their own
router.get(
  "/",
  authenticate,
  validateQuery(getSkillsQuerySchema),
  skillController.getAll
);

router.get(
  "/:id",
  authenticate,
  validateParams(skillIdParamSchema),
  skillController.getById
);

// Admin can update any skill, employees can update their own
router.put(
  "/:id",
  authenticate,
  validateParams(skillIdParamSchema),
  validate(updateSkillSchema),
  skillController.update
);

// Admin can delete any skill, employees can delete their own
router.delete(
  "/:id",
  authenticate,
  validateParams(skillIdParamSchema),
  skillController.delete
);

// Bulk operations - admin only
router.get(
  "/category/:categoryId",
  authenticate,
  allowRoles('admin'),
  skillController.getSkillsByCategory
);

router.get(
  "/category/:categoryId/unassigned",
  authenticate,
  allowRoles('admin'),
  skillController.getUnassignedSkills
);

router.post(
  "/bulk/assign",
  authenticate,
  allowRoles('admin'),
  validate(bulkAssignSchema),
  skillController.assignSkills
);

router.post(
  "/bulk/move",
  authenticate,
  allowRoles('admin'),
  validate(bulkAssignSchema),
  skillController.moveSkills
);

router.post(
  "/bulk/remove",
  authenticate,
  allowRoles('admin'),
  validate(bulkRemoveSchema),
  skillController.removeSkillsFromCategory
);

router.patch(
  "/bulk/archive",
  authenticate,
  allowRoles('admin'),
  validate(bulkArchiveSchema),
  skillController.bulkArchiveSkills
);

router.patch(
  "/bulk/status",
  authenticate,
  allowRoles('admin'),
  validate(bulkStatusSchema),
  skillController.bulkUpdateStatus
);

export default router;