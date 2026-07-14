import { Router } from "express";

import skillController from "../controllers/skill.controller";
import { validate, validateParams } from "../middlewares/validate.middleware";
import { validateQuery } from "../middlewares/validate-query.middleware";
import { allowRoles } from "../middlewares/role.middleware";

import {
  createSkillSchema,
  updateSkillSchema,
  skillIdParamSchema,
  getSkillsQuerySchema,
} from "../validators/skill.validator";

const router = Router();

// Admin can manage all skills, employees can manage their own
router.post(
  "/",
  validate(createSkillSchema),
  skillController.create
);

// Admin sees all skills, company sees their org's skills, employee sees their own
router.get(
  "/",
  validateQuery(getSkillsQuerySchema),
  skillController.getAll
);

router.get(
  "/:id",
  validateParams(skillIdParamSchema),
  skillController.getById
);

// Admin can update any skill, employees can update their own
router.put(
  "/:id",
  validateParams(skillIdParamSchema),
  validate(updateSkillSchema),
  skillController.update
);

// Admin can delete any skill, employees can delete their own
router.delete(
  "/:id",
  validateParams(skillIdParamSchema),
  skillController.delete
);

export default router;