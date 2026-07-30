import { Skill, ISkill } from "../models/skill.model";
import { CreateSkillDto, UpdateSkillDto, GetSkillsQueryDto } from "../dto/skill.dto";
import mongoose, { Schema } from "mongoose";

export class SkillRepository {
  /**
   * Create a new skill
   */
  async create(data: CreateSkillDto & { createdBy: string; createdType: string; companyId?: string }): Promise<ISkill> {
    const skill = new Skill(data);
    return skill.save();
  }

  /**
   * Find skill by ID
   */
  async findById(id: string): Promise<ISkill | null> {
    return Skill.findById(id)
      .populate("createdBy", "fullName email")
      .populate("categoryId", "name description")
      .exec();
  }

  /**
   * Find all skills with pagination and filtering
   */
  async findAll(query: GetSkillsQueryDto & { companyId?: string; accessibleCategoryIds?: string[] }): Promise<{ skills: ISkill[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, search, categoryId, status, createdType, archived, companyId, accessibleCategoryIds } = query;

    const filter: any = {};

    // Filter by search term
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by created type
    if (createdType) {
      filter.createdType = createdType;
    }

    // Filter by archived
    if (archived !== undefined) {
      filter.archived = archived;
    }

    // Filter by company - show skills created by company + admin skills in accessible categories
    if (companyId) {
      console.log('=== SKILL REPOSITORY DEBUG ===');
      console.log('companyId received:', companyId, 'type:', typeof companyId);
      console.log('categoryId filter:', categoryId);
      console.log('accessibleCategoryIds:', accessibleCategoryIds);
      
      // Build $or filters for company skills + admin skills in accessible categories
      const categoryFilters: any[] = [];
      
      // Company's own skills
      categoryFilters.push({ 
        createdType: "COMPANY", 
        companyId: companyId,
        archived: false
      });
      
      // Admin skills in accessible categories
      if (accessibleCategoryIds && accessibleCategoryIds.length > 0) {
        const validCategoryIds: any[] = [];
        
        for (const id of accessibleCategoryIds) {
          try {
            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
              validCategoryIds.push(new mongoose.Types.ObjectId(id));
            }
          } catch (err) {
            console.error(`Invalid category ID: ${id}`, err);
          }
        }
        
        if (validCategoryIds.length > 0) {
          categoryFilters.push({ 
            createdType: "ADMIN", 
            categoryId: { $in: validCategoryIds },
            archived: false
          });
        }
      }

      // Combine filters
      if (categoryFilters.length > 0) {
        filter.$or = categoryFilters;
      }
      
      console.log('Final filter.$or:', JSON.stringify(filter.$or));
      console.log('===========================');
    } else {
      // Not a company filter - just add archived if not specified
      if (archived === undefined) {
        filter.archived = false;
      }
    }

    // Filter by specific category (if provided) - APPLY AFTER company filter logic
    if (categoryId) {
      console.log('Applying categoryId filter:', categoryId);
      filter.categoryId = categoryId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [skills, total] = await Promise.all([
      Skill.find(filter)
        .populate("createdBy", "fullName email")
        .populate("categoryId", "_id name description")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      Skill.countDocuments(filter),
    ]);

    // Transform skills to rename categoryId to category for frontend
    const transformedSkills = skills.map((skill: any) => {
      const skillObj = skill.toObject?.() || skill;
      return {
        ...skillObj,
        category: skillObj.categoryId,  // Rename categoryId to category
      };
    });

    return {
      skills: transformedSkills,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Find skills by category
   */
  async findByCategory(categoryId: string, query: GetSkillsQueryDto = {}): Promise<{ skills: ISkill[]; total: number }> {
    const { page = 1, limit = 10, search, status, archived } = query;

    const filter: any = { categoryId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (archived !== undefined) {
      filter.archived = archived;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [skills, total] = await Promise.all([
      Skill.find(filter)
        .populate("createdBy", "fullName email")
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      Skill.countDocuments(filter),
    ]);

    return { skills, total };
  }

  /**
   * Find skill by name and ownership
   */
  async findByNameAndOwnership(name: string, createdType: string, companyId?: Schema.Types.ObjectId): Promise<ISkill | null> {
    const filter: any = { name, createdType };

    if (createdType === "ADMIN") {
      filter.companyId = null;
    } else {
      filter.companyId = companyId;
    }

    return Skill.findOne(filter).exec();
  }

  /**
   * Update skill
   */
  async update(id: string, data: UpdateSkillDto): Promise<ISkill | null> {
    return Skill.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate("createdBy", "fullName email")
      .populate("categoryId", "name")
      .exec();
  }

  /**
   * Archive/Restore skill
   */
  async setArchived(id: string, archived: boolean): Promise<ISkill | null> {
    return Skill.findByIdAndUpdate(id, { archived }, { new: true })
      .populate("categoryId", "name")
      .exec();
  }

  /**
   * Delete skill (soft delete via archive)
   */
  async delete(id: string): Promise<boolean> {
    const result = await Skill.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Get count of employees using skill
   */
  async getEmployeesUsingCount(skillId: string): Promise<number> {
    const SkillUser = require("../models/skillUser.model").SkillUser;
    return SkillUser.countDocuments({ skillId });
  }

  /**
   * Get count of companies using admin skill
   */
  async getCompaniesUsingCount(skillId: string): Promise<number> {
    const SkillUser = require("../models/skillUser.model").SkillUser;
    
    // Get unique companies from users who have this skill
    const result = await SkillUser.aggregate([
      { $match: { skillId: skillId as any } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $group: { _id: "$user.organisationId" } },
      { $count: "companies" },
    ]);

    return result.length > 0 ? result[0].companies : 0;
  }

  /**
   * Check if admin skill name is unique globally
   */
  async isAdminSkillNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const query: any = { name, createdType: "ADMIN" };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Skill.countDocuments(query);
    return count === 0;
  }

  /**
   * Check if company skill name is unique within company
   */
  async isCompanySkillNameUnique(name: string, companyId: string, excludeId?: string): Promise<boolean> {
    const query: any = { name, createdType: "COMPANY", companyId };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Skill.countDocuments(query);
    return count === 0;
  }

  /**
   * Find unassigned skills for a category
   */
  async findUnassignedSkills(categoryId: string, query: GetSkillsQueryDto = {}): Promise<{ skills: ISkill[]; total: number }> {
    const { page = 1, limit = 10, search, status, archived } = query;

    const filter: any = { categoryId: { $ne: categoryId } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (archived !== undefined) {
      filter.archived = archived;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [skills, total] = await Promise.all([
      Skill.find(filter)
        .populate("createdBy", "fullName email")
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      Skill.countDocuments(filter),
    ]);

    return { skills, total };
  }

  /**
   * Find skills by IDs
   */
  async findByIds(ids: string[]): Promise<ISkill[]> {
    return Skill.find({ _id: { $in: ids } })
      .populate("createdBy", "fullName email")
      .populate("categoryId", "name")
      .exec();
  }

  /**
   * Update category for multiple skills
   */
  async updateCategoryForSkills(skillIds: string[], categoryId: string): Promise<any> {
    return Skill.updateMany(
      { _id: { $in: skillIds } },
      { categoryId },
      { new: true }
    ).exec();
  }

  /**
   * Delete skills by IDs
   */
  async deleteByIds(skillIds: string[]): Promise<any> {
    return Skill.deleteMany({ _id: { $in: skillIds } }).exec();
  }

  /**
   * Bulk archive/unarchive skills by IDs
   */
  async bulkArchive(skillIds: string[], archived: boolean): Promise<any> {
    return Skill.updateMany(
      { _id: { $in: skillIds } },
      { archived },
      { new: true }
    ).exec();
  }

  /**
   * Bulk update skill status by IDs
   */
  async bulkUpdateStatus(skillIds: string[], status: 'active' | 'inactive'): Promise<any> {
    return Skill.updateMany(
      { _id: { $in: skillIds } },
      { status },
      { new: true }
    ).exec();
  }
}

export default new SkillRepository();
