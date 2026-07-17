import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import skillService from "../services/skill.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";

class SkillController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    // Employees can only create skills for themselves
    if (userRole === 'employee') {
      req.body.user_id = userId;
    }

    const skill = await skillService.create(req.body);

    return sendResponse(
      res,
      StatusCodes.CREATED,
      "Skill created successfully.",
      skill
    );
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;
    const organisationId = (req as any).user?.organisationId;

    // Employees can only see their own skills
    if (userRole === 'employee') {
      req.query.user_id = userId;
    }
    // Company can see skills of their organisation's employees
    else if (userRole === 'company') {
      req.query.organisation_id = organisationId;
    }
    // Admin can see all skills (no filter)

    const companyId = userRole === 'company'
      ? (req as any).user?.organisationId || (req as any).user?.userId
      : undefined;

    const result = await skillService.getAll(req.query, companyId);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills fetched successfully.",
      result
    );
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    const skill = await skillService.getById(req.params.id as string);

    // Check authorization - employees can only view their own skills
    if (userRole === 'employee') {
      const skillUserId = (skill.user_id as any)?._id 
        ? (skill.user_id as any)._id.toString() 
        : skill.user_id.toString();
      
      if (skillUserId !== userId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only view your own skills."
        );
      }
    }

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill fetched successfully.",
      skill
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    const skill = await skillService.getById(req.params.id as string);

    // Check authorization - employees can only update their own skills
    if (userRole === 'employee') {
      const skillUserId = (skill.user_id as any)?._id 
        ? (skill.user_id as any)._id.toString() 
        : skill.user_id.toString();
      
      if (skillUserId !== userId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only update your own skills."
        );
      }
      
      // Employees cannot change the user_id
      delete req.body.user_id;
    }

    const updatedSkill = await skillService.update(req.params.id as string, req.body);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill updated successfully.",
      updatedSkill
    );
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    const skill = await skillService.getById(req.params.id as string);

    // Check authorization - employees can only delete their own skills
    if (userRole === 'employee') {
      const skillUserId = (skill.user_id as any)?._id 
        ? (skill.user_id as any)._id.toString() 
        : skill.user_id.toString();
      
      if (skillUserId !== userId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only delete your own skills."
        );
      }
    }

    await skillService.delete(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill deleted successfully."
    );
  });
}

export default new SkillController();