import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import skillCategoryRepository from "../repositories/skillCategory.repository";
import { CreateSkillCategoryDto, UpdateSkillCategoryDto, GetSkillCategoriesQueryDto } from "../dto/skillCategory.dto";
import { Schema } from "mongoose";

class SkillCategoryService {
  /**
   * Create a new skill category
   */
  async create(data: CreateSkillCategoryDto, userId: string, userRole: string, companyId?: string) {
    // Check for duplicate names
    const createdType = userRole === "admin" ? "ADMIN" : "COMPANY";

    let isDuplicate: boolean;
    if (createdType === "ADMIN") {
      isDuplicate = !(await skillCategoryRepository.isAdminCategoryNameUnique(data.name));
    } else {
      isDuplicate = !(await skillCategoryRepository.isCompanyCategoryNameUnique(data.name, companyId!));
    }

    if (isDuplicate) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `A category with name "${data.name}" already exists${createdType === "COMPANY" ? " in your organization" : " globally"}`
      );
    }

    const category = await skillCategoryRepository.create({
      ...data,
      createdBy: userId,
      createdType,
      companyId: companyId,
    });

    return category;
  }

  /**
   * Get all skill categories
   */
  async getAll(query: GetSkillCategoriesQueryDto, userRole: string, companyId?: string) {
    const companyIdObjectId = companyId ? new Schema.Types.ObjectId(companyId) : undefined;

    const result = await skillCategoryRepository.findAll({
      ...query,
      companyId: userRole === "company" ? companyIdObjectId : undefined,
    });

    return result;
  }

  /**
   * Get skill category by ID
   */
  async getById(id: string) {
    const category = await skillCategoryRepository.findById(id);

    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Enrich with additional data
    const skillsCount = await skillCategoryRepository.getSkillsCount(id);
    const companiesCount = category.createdType === "ADMIN" ? await skillCategoryRepository.getCompaniesUsingCount(id) : 0;

    return {
      ...category.toObject(),
      skillsCount,
      companiesUsingCount: companiesCount,
    };
  }

  /**
   * Update skill category
   */
  async update(id: string, data: UpdateSkillCategoryDto) {
    // If name is being updated, check for duplicates
    if (data.name) {
      const category = await skillCategoryRepository.findById(id);

      if (!category) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
      }

      let isDuplicate: boolean;
      if (category.createdType === "ADMIN") {
        isDuplicate = !(await skillCategoryRepository.isAdminCategoryNameUnique(data.name, id));
      } else {
        isDuplicate = !(await skillCategoryRepository.isCompanyCategoryNameUnique(
          data.name,
          category.companyId?.toString() || "",
          id
        ));
      }

      if (isDuplicate) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `A category with name "${data.name}" already exists`
        );
      }
    }

    const updated = await skillCategoryRepository.update(id, data);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    return updated;
  }

  /**
   * Archive/Unarchive skill category
   */
  async setArchived(id: string, archived: boolean) {
    const updated = await skillCategoryRepository.setArchived(id, archived);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    return updated;
  }

  /**
   * Delete skill category
   */
  async delete(id: string) {
    const deleted = await skillCategoryRepository.delete(id);

    if (!deleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    return { message: "Skill category deleted successfully" };
  }
}

export default new SkillCategoryService();
