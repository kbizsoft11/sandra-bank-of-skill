import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import skillService from "../services/skill.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { getUserFullName } from "../utils/user.util";
import { ActivityService } from "../services/activity.service";

class SkillController {
  /**
   * Create skill
   * POST /api/skills
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;
    const fullNameFromToken = (req as any).user?.fullName;
    const email = (req as any).user?.email;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    // Get full name from token or database
    const fullName = await getUserFullName(fullNameFromToken, userId);
    
    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);

    const skill = await skillService.create(
      req.body,
      userId,
      userRole,
      userRole === "company" ? companyId : undefined,
      { fullName, email },
      ipAddress,
      userAgent
    );

    return sendResponse(
      res,
      StatusCodes.CREATED,
      "Skill created successfully",
      skill
    );
  });

  /**
   * Get all skills
   * GET /api/skills
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const result = await skillService.getAll(
      req.query as any,
      userRole,
      userRole === "company" ? companyId : undefined
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills fetched successfully",
      result
    );
  });

  /**
   * Get skill by ID
   * GET /api/skills/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.getById(req.params.id as string);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill fetched successfully",
      skill
    );
  });

  /**
   * Get skills by category
   * GET /api/skills/category/:categoryId
   */
  getByCategory = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillService.getByCategory(req.params.categoryId as string, req.query as any);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills fetched successfully",
      result
    );
  });

  /**
   * Get skills by category (alias for bulk operations)
   * GET /api/skills/category/:categoryId
   */
  getSkillsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillService.getByCategory(req.params.categoryId as string, req.query as any);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills fetched successfully",
      result
    );
  });

  /**
   * Get unassigned skills for a category
   * GET /api/skills/category/:categoryId/unassigned
   */
  getUnassignedSkills = asyncHandler(async (req: Request, res: Response) => {
    const result = await skillService.getUnassignedSkills(req.params.categoryId as string, req.query as any);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Unassigned skills fetched successfully",
      result
    );
  });

  /**
   * Assign skills to category
   * POST /api/skills/bulk/assign
   */
  assignSkills = asyncHandler(async (req: Request, res: Response) => {
    const { skillIds, targetCategoryId } = req.body;
    const result = await skillService.assignSkillsToCategory(skillIds, targetCategoryId);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills assigned successfully",
      result
    );
  });

  /**
   * Move skills between categories
   * POST /api/skills/bulk/move
   */
  moveSkills = asyncHandler(async (req: Request, res: Response) => {
    const { skillIds, targetCategoryId } = req.body;
    const result = await skillService.moveSkillsToCategory(skillIds, targetCategoryId);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills moved successfully",
      result
    );
  });

  /**
   * Remove skills from category
   * POST /api/skills/bulk/remove
   */
  removeSkillsFromCategory = asyncHandler(async (req: Request, res: Response) => {
    const { skillIds } = req.body;
    const result = await skillService.removeSkillsFromCategory(skillIds);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skills removed successfully",
      result
    );
  });

  /**
   * Update skill
   * PATCH /api/skills/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;
    const fullNameFromToken = (req as any).user?.fullName;
    const email = (req as any).user?.email;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    // Get full name from token or database
    const fullName = await getUserFullName(fullNameFromToken, userId);
    
    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);

    const skill = await skillService.update(
      req.params.id as string,
      req.body,
      userId,
      userRole,
      userRole === "company" ? companyId : undefined,
      { fullName, email },
      ipAddress,
      userAgent
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      "Skill updated successfully",
      skill
    );
  });

  /**
   * Archive skill
   * PATCH /api/skills/:id/archive
   */
  archive = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;
    const fullNameFromToken = (req as any).user?.fullName;
    const email = (req as any).user?.email;
    const { archived } = req.body;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    // Get full name from token or database
    const fullName = await getUserFullName(fullNameFromToken, userId);
    
    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);

    const skill = await skillService.setArchived(
      req.params.id as string,
      archived,
      userId,
      userRole,
      userRole === "company" ? companyId : undefined,
      { fullName, email },
      ipAddress,
      userAgent
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      `Skill ${archived ? "archived" : "restored"} successfully`,
      skill
    );
  });

  /**
   * Bulk archive skills
   * PATCH /api/skills/bulk/archive
   */
  bulkArchiveSkills = asyncHandler(async (req: Request, res: Response) => {
    const { skillIds, archived } = req.body;
    const result = await skillService.bulkArchiveSkills(skillIds, archived);

    return sendResponse(
      res,
      StatusCodes.OK,
      `${archived ? "Archived" : "Restored"} ${skillIds.length} skill(s) successfully`,
      result
    );
  });

  /**
   * Bulk update skill status
   * PATCH /api/skills/bulk/status
   */
  bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { skillIds, status } = req.body;
    const result = await skillService.bulkUpdateStatus(skillIds, status);

    return sendResponse(
      res,
      StatusCodes.OK,
      `Updated ${skillIds.length} skill(s) to ${status} successfully`,
      result
    );
  });

  /**
   * Delete skill
   * DELETE /api/skills/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;
    const fullNameFromToken = (req as any).user?.fullName;
    const email = (req as any).user?.email;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
    }

    // Get full name from token or database
    const fullName = await getUserFullName(fullNameFromToken, userId);
    
    // Extract IP and user agent from request
    const ipAddress = ActivityService.getClientIp(req);
    const userAgent = ActivityService.getUserAgent(req);

    const result = await skillService.delete(
      req.params.id as string,
      userId,
      userRole,
      userRole === "company" ? companyId : undefined,
      { fullName, email },
      ipAddress,
      userAgent
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      null
    );
  });
}

export default new SkillController();
