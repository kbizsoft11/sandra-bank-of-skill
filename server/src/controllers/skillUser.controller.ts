import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import skillUserService from "../services/skillUser.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";

class SkillUserController {
  /**
   * Upsert user skill (create or update)
   * POST /api/skill-users/upsert
   */
  upsert = asyncHandler(async (req: Request, res: Response) => {
    const { userId, skillId, ...updateData } = req.body;

    if (!userId || !skillId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "userId and skillId are required");
    }

    const skillUser = await skillUserService.upsert(userId, skillId, updateData);

    return sendResponse(
      res,
      StatusCodes.OK,
      "User skill saved successfully",
      skillUser
    );
  });

  /**
   * Get all skills for a user
   * GET /api/skill-users/user/:userId
   */
  getByUser = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillUserService.getByUser(
      req.params.userId as string,
      req.query as any
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "User skills fetched successfully",
      result
    );
  });

  /**
   * Get all users for a skill
   * GET /api/skill-users/skill/:skillId
   */
  getBySkill = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillUserService.getBySkill(
      req.params.skillId as string,
      req.query as any
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill users fetched successfully",
      result
    );
  });

  /**
   * Get user skill by ID
   * GET /api/skill-users/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const skillUser = await skillUserService.getById(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "User skill fetched successfully",
      skillUser
    );
  });

  /**
   * Update user skill
   * PATCH /api/skill-users/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const skillUser = await skillUserService.update(req.params.id as string, req.body);

    return sendResponse(
      res,
      StatusCodes.OK,
      "User skill updated successfully",
      skillUser
    );
  });

  /**
   * Delete user skill
   * DELETE /api/skill-users/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillUserService.delete(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      null
    );
  });

  /**
   * Get skills from questionnaire
   * GET /api/skill-users/questionnaire/:questionnaireId
   */
  getFromQuestionnaire = asyncHandler(async (req: Request, res: Response) => {
    const skills = await skillUserService.getFromQuestionnaire(req.params.questionnaireId as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Questionnaire skills fetched successfully",
      skills
    );
  });

  /**
   * Get user skills in enabled categories
   * GET /api/skill-users/enabled-categories/:userId
   */
  getInEnabledCategories = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const skills = await skillUserService.getUserSkillsInEnabledCategories(
      req.params.userId as string,
      companyId
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "Enabled category skills fetched successfully",
      skills
    );
  });
}

export default new SkillUserController();
