import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import { SkillCategory } from "../models/skillCategory.model";
import { Skill } from "../models/skill.model";

/**
 * Check if user can view skill category
 * Admin: can view all
 * Company: can view admin + own
 */
export const canViewSkillCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const category = await SkillCategory.findById(categoryId);

    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    if (userRole === "admin") {
      // Admin can view all
      (req as any).skillCategory = category;
      return next();
    }

    if (userRole === "company") {
      // Company can view admin categories or their own
      if (category.createdType === "ADMIN") {
        (req as any).skillCategory = category;
        return next();
      }

      if (category.companyId?.toString() === companyId) {
        (req as any).skillCategory = category;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to view this category");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can edit skill category
 * Admin: can edit all
 * Company: can edit only their own (not admin categories)
 */
export const canEditSkillCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const category = await SkillCategory.findById(categoryId);

    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    if (userRole === "admin") {
      (req as any).skillCategory = category;
      return next();
    }

    if (userRole === "company") {
      // Company cannot edit admin categories
      if (category.createdType === "ADMIN") {
        throw new ApiError(StatusCodes.FORBIDDEN, "You cannot edit admin categories");
      }

      // Company can edit only their own
      if (category.companyId?.toString() === companyId) {
        (req as any).skillCategory = category;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to edit this category");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can delete skill category
 * Admin: can delete all
 * Company: can delete only their own (not admin categories)
 */
export const canDeleteSkillCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const category = await SkillCategory.findById(categoryId);

    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    if (userRole === "admin") {
      (req as any).skillCategory = category;
      return next();
    }

    if (userRole === "company") {
      // Company cannot delete admin categories
      if (category.createdType === "ADMIN") {
        throw new ApiError(StatusCodes.FORBIDDEN, "You cannot delete admin categories");
      }

      // Company can delete only their own
      if (category.companyId?.toString() === companyId) {
        (req as any).skillCategory = category;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to delete this category");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can view skill
 * Admin: can view all
 * Company: can view admin + own
 */
export const canViewSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const skill = await Skill.findById(skillId);

    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    if (userRole === "admin") {
      (req as any).skill = skill;
      return next();
    }

    if (userRole === "company") {
      if (skill.createdType === "ADMIN") {
        (req as any).skill = skill;
        return next();
      }

      if (skill.companyId?.toString() === companyId) {
        (req as any).skill = skill;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to view this skill");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can edit skill
 * Admin: can edit all
 * Company: can edit only their own (not admin skills)
 */
export const canEditSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const skill = await Skill.findById(skillId);

    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    if (userRole === "admin") {
      (req as any).skill = skill;
      return next();
    }

    if (userRole === "company") {
      if (skill.createdType === "ADMIN") {
        throw new ApiError(StatusCodes.FORBIDDEN, "You cannot edit admin skills");
      }

      if (skill.companyId?.toString() === companyId) {
        (req as any).skill = skill;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to edit this skill");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can delete skill
 * Admin: can delete all
 * Company: can delete only their own (not admin skills)
 */
export const canDeleteSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = req.params.id;
    const userRole = (req as any).user?.role;
    const companyId = (req as any).user?.organisationId;

    const skill = await Skill.findById(skillId);

    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    if (userRole === "admin") {
      (req as any).skill = skill;
      return next();
    }

    if (userRole === "company") {
      if (skill.createdType === "ADMIN") {
        throw new ApiError(StatusCodes.FORBIDDEN, "You cannot delete admin skills");
      }

      if (skill.companyId?.toString() === companyId) {
        (req as any).skill = skill;
        return next();
      }

      throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to delete this skill");
    }

    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
  } catch (error) {
    next(error);
  }
};
