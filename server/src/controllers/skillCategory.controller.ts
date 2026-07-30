import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import skillCategoryService from "../services/skillCategory.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";

class SkillCategoryController {
  /**
   * Create skill category
   * POST /api/skill-categories
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    console.log('=== CREATE SKILL CATEGORY DEBUG ===');
    console.log('req.user:', (req as any).user);
    console.log('req.body:', req.body);
    console.log('===================================');

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    console.log('Extracted userId:', userId);
    console.log('Extracted userRole:', userRole);
    console.log('Extracted companyId:', companyId);

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    const category = await skillCategoryService.create(
      req.body,
      userId,
      userRole,
      userRole === "company" ? companyId : undefined
    );

    return sendResponse(
      res,
      StatusCodes.CREATED,
      "Skill category created successfully",
      category
    );
  });

  /**
   * Get all skill categories
   * GET /api/skill-categories
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const result = await skillCategoryService.getAll(
      req.query as any,
      userRole,
      userRole === "company" ? companyId : undefined
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill categories fetched successfully",
      result
    );
  });

  /**
   * Get skill category by ID
   * GET /api/skill-categories/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const category = await skillCategoryService.getById(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill category fetched successfully",
      category
    );
  });

  /**
   * Update skill category
   * PATCH /api/skill-categories/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const category = await skillCategoryService.update(req.params.id as string, req.body);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill category updated successfully",
      category
    );
  });

  /**
   * Archive skill category
   * PATCH /api/skill-categories/:id/archive
   */
  archive = asyncHandler(async (req: Request, res: Response) => {
    const { archived } = req.body;

    const category = await skillCategoryService.setArchived(req.params.id as string, archived);

    return sendResponse(
      res,
      StatusCodes.OK,
      `Skill category ${archived ? "archived" : "restored"} successfully`,
      category
    );
  });

  /**
   * Delete skill category
   * DELETE /api/skill-categories/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillCategoryService.delete(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      null
    );
  });
}

export default new SkillCategoryController();
