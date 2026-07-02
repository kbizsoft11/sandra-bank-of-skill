import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import skillService from "../services/skill.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";

class SkillController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.create(req.body);

    return sendResponse(
      res,
      StatusCodes.CREATED,
      "Skill created successfully.",
      skill
    );
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillService.getAll(req.query);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills fetched successfully.",
      result
    );
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.getById(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill fetched successfully.",
      skill
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.update(req.params.id as string, req.body);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill updated successfully.",
      skill
    );
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await skillService.delete(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill deleted successfully."
    );
  });
}

export default new SkillController();