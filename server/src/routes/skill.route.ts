import { Router } from "express";

import skillController from "../controllers/skill.controller";
import { validate, validateParams } from "../middlewares/validate.middleware";
import { validateQuery } from "../middlewares/validate-query.middleware";

import {
  createSkillSchema,
  updateSkillSchema,
  skillIdParamSchema,
  getSkillsQuerySchema,
} from "../validators/skill.validator";

const router = Router();

router.post(
  "/",
  validate(createSkillSchema),
  skillController.create
);

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

router.put(
  "/:id",
  validateParams(skillIdParamSchema),
  validate(updateSkillSchema),
  skillController.update
);

router.delete(
  "/:id",
  validateParams(skillIdParamSchema),
  skillController.delete
);

export default router;