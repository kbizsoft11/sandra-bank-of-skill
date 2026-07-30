import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import skillRepository from "../repositories/skill.repository";
import skillCategoryRepository from "../repositories/skillCategory.repository";
import { CompanySkillCategoryRepository } from "../repositories/company-skill-category.repository";
import { CreateSkillDto, UpdateSkillDto, GetSkillsQueryDto } from "../dto/skill.dto";
import { Schema } from "mongoose";

class SkillService {
  /**
   * Create a new skill
   */
  async create(data: CreateSkillDto, userId: string, userRole: string, companyId?: string) {
    const categoryId = data.categoryId;

    // Verify category exists
    const category = await skillCategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Check permissions - can only add skills to own/allowed categories
    if (userRole === "company") {
      const companyIdObjectId = new Schema.Types.ObjectId(companyId!);
      
      // Case 1: Company's own category
      if (category.createdType === "COMPANY" && category.companyId?.toString() === companyId) {
        // OK - allowed
      }
      // Case 2: Admin category that company has selected
      else if (category.createdType === "ADMIN") {
        const companySkillCategoryRepo = new CompanySkillCategoryRepository();
        
        const mapping = await companySkillCategoryRepo.findByCompanyAndCategory(companyId || "", categoryId);
        if (!mapping) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You can only add skills to your own categories or selected admin categories"
          );
        }
      }
      // Case 3: Admin category or other company's category - not allowed
      else {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only add skills to your own categories or selected admin categories"
        );
      }
    }

    // Check for duplicate names
    const createdType = userRole === "admin" ? "ADMIN" : "COMPANY";

    let isDuplicate: boolean;
    if (createdType === "ADMIN") {
      isDuplicate = !(await skillRepository.isAdminSkillNameUnique(data.name));
    } else {
      isDuplicate = !(await skillRepository.isCompanySkillNameUnique(data.name, companyId || ""));
    }

    if (isDuplicate) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `A skill with name "${data.name}" already exists${createdType === "COMPANY" ? " in your organization" : " globally"}`
      );
    }

    const skill = await skillRepository.create({
      ...data,
      categoryId,
      createdBy: userId,
      createdType,
      companyId: companyId,
    });

    return skill;
  }

  /**
   * Get all skills
   */
  async getAll(query: GetSkillsQueryDto, userRole: string, companyId?: string) {
    let accessibleCategoryIds: string[] = [];

    // If company user, get their accessible categories
    if (userRole === "company" && companyId) {
      // Get company's own categories + selected admin categories
      const companySkillCategoryRepo = new CompanySkillCategoryRepository();
      
      const [ownCategories, selectedMappings] = await Promise.all([
        skillCategoryRepository.find(
          { createdType: "COMPANY", companyId },
          0,
          1000
        ),
        companySkillCategoryRepo.findAllByCompany(companyId)
      ]);

      // Extract category IDs from company's own categories
      for (const cat of ownCategories) {
        if (cat._id) {
          accessibleCategoryIds.push(cat._id.toString());
        }
      }
      
      // Extract category IDs from selected admin categories
      for (const mapping of selectedMappings) {
        if (mapping.skillCategoryId) {
          accessibleCategoryIds.push(mapping.skillCategoryId.toString());
        }
      }
    }

    const result = await skillRepository.findAll({
      ...query,
      companyId: userRole === "company" ? companyId : undefined,
      accessibleCategoryIds: accessibleCategoryIds.length > 0 ? accessibleCategoryIds : undefined
    });

    return result;
  }

  /**
   * Get skill by ID
   */
  async getById(id: string) {
    const skill = await skillRepository.findById(id);

    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    // Enrich with additional data
    const employeesCount = await skillRepository.getEmployeesUsingCount(id);
    const companiesCount = skill.createdType === "ADMIN" ? await skillRepository.getCompaniesUsingCount(id) : 0;

    return {
      ...skill.toObject(),
      usedByEmployeesCount: employeesCount,
      companiesUsingCount: companiesCount,
    };
  }

  /**
   * Get skills by category
   */
  async getByCategory(categoryId: string, query: GetSkillsQueryDto = {}) {
    // Verify category exists
    const category = await skillCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    return skillRepository.findByCategory(categoryId, query);
  }

  /**
   * Update skill
   */
  async update(id: string, data: UpdateSkillDto, userRole?: string, companyId?: string) {
    // Verify skill exists
    const skill = await skillRepository.findById(id);
    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    // Check permissions - company can only edit their own skills
    if (userRole === "company") {
      if (skill.createdType === "ADMIN") {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You cannot edit admin-created skills"
        );
      }
      if (skill.companyId?.toString() !== companyId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only edit your own skills"
        );
      }
    }

    // If category is being updated, verify new category exists and company has access
    if (data.categoryId && data.categoryId !== skill.categoryId.toString()) {
      const category = await skillCategoryRepository.findById(data.categoryId);
      if (!category) {
        throw new ApiError(StatusCodes.NOT_FOUND, "New skill category not found");
      }

      // Verify company has access to new category
      if (userRole === "company") {
        const companyIdObjectId = new Schema.Types.ObjectId(companyId!);

        // Case 1: Company's own category
        if (category.createdType === "COMPANY" && category.companyId?.toString() === companyId) {
          // OK - allowed
        }
        // Case 2: Admin category that company has selected
        else if (category.createdType === "ADMIN") {
          const companySkillCategoryRepo = new CompanySkillCategoryRepository();
          
          const mapping = await companySkillCategoryRepo.findByCompanyAndCategory(companyId || "", data.categoryId);
          if (!mapping) {
            throw new ApiError(
              StatusCodes.FORBIDDEN,
              "You can only use your own categories or selected admin categories"
            );
          }
        }
        // Case 3: Not allowed
        else {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You can only use your own categories or selected admin categories"
          );
        }
      }
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name !== skill.name) {
      let isDuplicate: boolean;
      if (skill.createdType === "ADMIN") {
        isDuplicate = !(await skillRepository.isAdminSkillNameUnique(data.name, id));
      } else {
        isDuplicate = !(await skillRepository.isCompanySkillNameUnique(
          data.name,
          skill.companyId?.toString() || "",
          id
        ));
      }

      if (isDuplicate) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `A skill with name "${data.name}" already exists`
        );
      }
    }

    const updated = await skillRepository.update(id, data);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    return updated;
  }

  /**
   * Archive/Unarchive skill
   */
  async setArchived(id: string, archived: boolean) {
    const updated = await skillRepository.setArchived(id, archived);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    return updated;
  }

  /**
   * Delete skill
   */
  async delete(id: string, userRole?: string, companyId?: string) {
    const skill = await skillRepository.findById(id);

    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    // Check permissions - company can only delete their own skills
    if (userRole === "company") {
      if (skill.createdType !== "COMPANY" || skill.companyId?.toString() !== companyId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You can only delete your own skills"
        );
      }
    }

    const deleted = await skillRepository.delete(id);

    if (!deleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    return { message: "Skill deleted successfully" };
  }

  /**
   * Get unassigned skills for a category
   */
  async getUnassignedSkills(categoryId: string, query: GetSkillsQueryDto = {}) {
    // Verify category exists
    const category = await skillCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    return skillRepository.findUnassignedSkills(categoryId, query);
  }

  /**
   * Assign skills to category
   */
  async assignSkillsToCategory(skillIds: string[], categoryId: string) {
    // Verify category exists
    const category = await skillCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Verify skills exist
    const skills = await skillRepository.findByIds(skillIds);
    if (skills.length !== skillIds.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "One or more skills not found");
    }

    // Update category for all skills
    return skillRepository.updateCategoryForSkills(skillIds, categoryId);
  }

  /**
   * Move skills between categories
   */
  async moveSkillsToCategory(skillIds: string[], categoryId: string) {
    return this.assignSkillsToCategory(skillIds, categoryId);
  }

  /**
   * Remove skills from category
   */
  async removeSkillsFromCategory(skillIds: string[]) {
    // Verify skills exist
    const skills = await skillRepository.findByIds(skillIds);
    if (skills.length !== skillIds.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "One or more skills not found");
    }

    // Delete skills
    return skillRepository.deleteByIds(skillIds);
  }

  /**
   * Bulk archive/unarchive skills
   */
  async bulkArchiveSkills(skillIds: string[], archived: boolean) {
    // Verify skills exist
    const skills = await skillRepository.findByIds(skillIds);
    if (skills.length !== skillIds.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "One or more skills not found");
    }

    // Update archived status for all skills
    return skillRepository.bulkArchive(skillIds, archived);
  }

  /**
   * Bulk update skill status
   */
  async bulkUpdateStatus(skillIds: string[], status: 'active' | 'inactive') {
    // Verify skills exist
    const skills = await skillRepository.findByIds(skillIds);
    if (skills.length !== skillIds.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "One or more skills not found");
    }

    // Update status for all skills
    return skillRepository.bulkUpdateStatus(skillIds, status);
  }
}

export default new SkillService();
