import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import skillRepository from "../repositories/skill.repository";
import skillCategoryRepository from "../repositories/skillCategory.repository";
import { CompanySkillCategoryRepository } from "../repositories/company-skill-category.repository";
import { CreateSkillDto, UpdateSkillDto, GetSkillsQueryDto } from "../dto/skill.dto";
import { Schema } from "mongoose";
import activityService from "./activity.service";
import { ACTIVITY_TYPES, RESOURCE_TYPES } from "../constants/activity-types";

class SkillService {
  /**
   * Create a new skill
   */
  async create(
    data: CreateSkillDto,
    userId: string,
    userRole: string,
    companyId?: string,
    userData?: { fullName: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ) {
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

    // Log activity
    try {
      await activityService.logActivity({
        userId,
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: userRole as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.CREATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: skill._id?.toString(),
        resourceName: skill.name,
        description: `Skill "${skill.name}" created${createdType === "COMPANY" ? " by company" : " by admin"}`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details: { createdType, categoryId },
      });
    } catch (err) {
      // Log error but don't throw - logging should never break main flow
      console.error('Error logging skill creation activity:', err);
    }

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
   * Get skills by category - filtered by category creator
   */
  async getByCategory(categoryId: string, query: GetSkillsQueryDto = {}) {
    // Verify category exists
    const category = await skillCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Get skills only created by the same user who created the category
    // Pass the createdBy filter to the repository
    return skillRepository.findByCategory(categoryId, query, category.createdBy);
  }

  /**
   * Update skill
   */
  async update(
    id: string, 
    data: UpdateSkillDto, 
    userId: string,
    userRole?: string, 
    companyId?: string, 
    userData?: { fullName: string; email: string }, 
    ipAddress?: string, 
    userAgent?: string
  ) {
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
    // Allow null categoryId to make skills orphan
    const currentCategoryId = skill.categoryId ? skill.categoryId.toString() : null;
    if (data.categoryId !== undefined && data.categoryId !== currentCategoryId) {
      // If categoryId is being set to null, that's allowed (makes skill orphan)
      if (data.categoryId === null) {
        // Making skill orphan - this is allowed
      } else {
        // Setting to a specific category - validate it exists and user has access
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

    // Log activity - log the current user who is updating, not the creator
    try {
      const updatedFields = Object.keys(data).join(', ');
      // Need to get userId from somewhere - we don't have it in this method
      // We need to pass it from the controller
      await activityService.logActivity({
        userId: userId || 'unknown',
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: (userRole || 'admin') as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: id,
        resourceName: updated.name,
        description: `Skill "${updated.name}" updated (${updatedFields})`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details: { updatedFields: Object.keys(data) },
      });
    } catch (err) {
      console.error('Error logging skill update activity:', err);
    }

    return updated;
  }

  /**
   * Archive/Unarchive skill
   */
  async setArchived(
    id: string, 
    archived: boolean, 
    userId: string,
    userRole?: string, 
    companyId?: string, 
    userData?: { fullName: string; email: string }, 
    ipAddress?: string, 
    userAgent?: string
  ) {
    const skill = await skillRepository.findById(id);
    
    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    const updated = await skillRepository.setArchived(id, archived);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    // Log activity
    try {
      await activityService.logActivity({
        userId: userId || 'unknown',
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: (userRole || 'admin') as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: id,
        resourceName: skill.name,
        description: `Skill "${skill.name}" ${archived ? 'archived' : 'restored'}`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details: { archived },
      });
    } catch (err) {
      console.error('Error logging skill archive activity:', err);
    }

    return updated;
  }

  /**
   * Delete skill
   */
  async delete(
    id: string, 
    userId: string,
    userRole?: string, 
    companyId?: string, 
    userData?: { fullName: string; email: string }, 
    ipAddress?: string, 
    userAgent?: string
  ) {
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

    // Log activity - log the current user who is deleting
    try {
      await activityService.logActivity({
        userId: userId || 'unknown',
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: (userRole || 'admin') as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.DELETE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: id,
        resourceName: skill.name,
        description: `Skill "${skill.name}" deleted`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
      });
    } catch (err) {
      console.error('Error logging skill deletion activity:', err);
    }

    return { message: "Skill deleted successfully" };
  }

  /**
   * Get unassigned skills for a category - filtered by category creator
   */
  async getUnassignedSkills(categoryId: string, query: GetSkillsQueryDto = {}) {
    // Verify category exists
    const category = await skillCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Get unassigned skills only created by the same user who created the category
    return skillRepository.findUnassignedSkills(categoryId, query, category.createdBy);
  }

  /**
   * Assign skills to category (handles orphan skills with null categoryId)
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

    // Update category for all skills (works for both categorized and orphan skills)
    const result = await skillRepository.updateCategoryForSkills(skillIds, categoryId);
    
    // Log activity for bulk assign
    try {
      await activityService.logActivity({
        userId: 'admin-bulk-operation',
        userName: 'Admin Bulk Operation',
        userEmail: 'admin@system.local',
        userRole: 'admin' as const,
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: skillIds.join(', '),
        resourceName: `${skillIds.length} skills`,
        description: `Bulk assigned ${skillIds.length} skill(s) to category "${category.name}"`,
        status: 'success',
        ipAddress: 'internal',
        userAgent: 'bulk-operation',
        details: { operation: 'assignToCategory', count: skillIds.length, categoryId, categoryName: category.name },
      });
    } catch (err) {
      console.error('Error logging bulk assign activity:', err);
    }

    return result;
  }

  /**
   * Move skills between categories
   */
  async moveSkillsToCategory(skillIds: string[], categoryId: string) {
    return this.assignSkillsToCategory(skillIds, categoryId);
  }

  /**
   * Remove skills from category (make them orphan by setting categoryId to null)
   */
  async removeSkillsFromCategory(skillIds: string[]) {
    // Verify skills exist
    const skills = await skillRepository.findByIds(skillIds);
    if (skills.length !== skillIds.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, "One or more skills not found");
    }

    // Set categoryId to null (make them orphan)
    const result = await skillRepository.removeFromCategory(skillIds);
    
    // Log activity for bulk remove
    try {
      await activityService.logActivity({
        userId: 'admin-bulk-operation',
        userName: 'Admin Bulk Operation',
        userEmail: 'admin@system.local',
        userRole: 'admin' as const,
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: skillIds.join(', '),
        resourceName: `${skillIds.length} skills`,
        description: `Bulk removed ${skillIds.length} skill(s) from category (made orphan)`,
        status: 'success',
        ipAddress: 'internal',
        userAgent: 'bulk-operation',
        details: { operation: 'removeFromCategory', count: skillIds.length },
      });
    } catch (err) {
      console.error('Error logging bulk remove activity:', err);
    }

    return result;
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
    const result = await skillRepository.bulkArchive(skillIds, archived);
    
    // Log activity for bulk archive
    try {
      await activityService.logActivity({
        userId: 'admin-bulk-operation',
        userName: 'Admin Bulk Operation',
        userEmail: 'admin@system.local',
        userRole: 'admin' as const,
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: skillIds.join(', '),
        resourceName: `${skillIds.length} skills`,
        description: `Bulk ${archived ? 'archived' : 'restored'} ${skillIds.length} skill(s)`,
        status: 'success',
        ipAddress: 'internal',
        userAgent: 'bulk-operation',
        details: { operation: 'bulkArchive', count: skillIds.length, archived },
      });
    } catch (err) {
      console.error('Error logging bulk archive activity:', err);
    }

    return result;
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
    const result = await skillRepository.bulkUpdateStatus(skillIds, status);
    
    // Log activity for bulk status update
    try {
      await activityService.logActivity({
        userId: 'admin-bulk-operation',
        userName: 'Admin Bulk Operation',
        userEmail: 'admin@system.local',
        userRole: 'admin' as const,
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL,
        resourceId: skillIds.join(', '),
        resourceName: `${skillIds.length} skills`,
        description: `Bulk updated ${skillIds.length} skill(s) status to ${status}`,
        status: 'success',
        ipAddress: 'internal',
        userAgent: 'bulk-operation',
        details: { operation: 'bulkUpdateStatus', count: skillIds.length, newStatus: status },
      });
    } catch (err) {
      console.error('Error logging bulk status update activity:', err);
    }

    return result;
  }
}

export default new SkillService();
