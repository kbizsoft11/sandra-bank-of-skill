import { SkillCategory, ISkillCategory } from "../models/skillCategory.model";
import { CreateSkillCategoryDto, UpdateSkillCategoryDto, GetSkillCategoriesQueryDto } from "../dto/skillCategory.dto";
import { Schema } from "mongoose";

export class SkillCategoryRepository {
  /**
   * Create a new skill category
   */
  async create(data: CreateSkillCategoryDto & { createdBy: string; createdType: string; companyId?: string }): Promise<ISkillCategory> {
    const category = new SkillCategory(data);
    return category.save();
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<ISkillCategory | null> {
    return SkillCategory.findById(id)
      .populate("createdBy", "fullName email")
      .exec();
  }

  /**
   * Find all categories with pagination and filtering
   */
  async findAll(query: GetSkillCategoriesQueryDto & { companyId?: Schema.Types.ObjectId }): Promise<{ categories: ISkillCategory[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, search, status, createdType, archived, companyId } = query;

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

    // Filter by company (if company is provided, show their categories + admin categories)
    if (companyId) {
      filter.$or = [
        { createdType: "ADMIN", archived: false },
        { companyId: companyId, archived: false },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [categories, total] = await Promise.all([
      SkillCategory.find(filter)
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      SkillCategory.countDocuments(filter),
    ]);

    return {
      categories,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Find category by name and ownership
   */
  async findByNameAndOwnership(name: string, createdType: string, companyId?: Schema.Types.ObjectId): Promise<ISkillCategory | null> {
    const filter: any = { name, createdType };

    if (createdType === "ADMIN") {
      filter.companyId = null;
    } else {
      filter.companyId = companyId;
    }

    return SkillCategory.findOne(filter).exec();
  }

  /**
   * Update category
   */
  async update(id: string, data: UpdateSkillCategoryDto): Promise<ISkillCategory | null> {
    return SkillCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate("createdBy", "fullName email")
      .exec();
  }

  /**
   * Archive/Restore category
   */
  async setArchived(id: string, archived: boolean): Promise<ISkillCategory | null> {
    return SkillCategory.findByIdAndUpdate(id, { archived }, { new: true })
      .populate("createdBy", "fullName email")
      .exec();
  }

  /**
   * Delete category (soft delete via archive)
   */
  async delete(id: string): Promise<boolean> {
    const result = await SkillCategory.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Get count of skills in category
   */
  async getSkillsCount(categoryId: string): Promise<number> {
    const Skill = require("../models/skill.model").Skill;
    return Skill.countDocuments({ categoryId, archived: false });
  }

  /**
   * Get count of companies using admin category
   */
  async getCompaniesUsingCount(categoryId: string): Promise<number> {
    const CompanyCategory = require("../models/companyCategory.model").CompanyCategory;
    return CompanyCategory.countDocuments({ categoryId, enabled: true });
  }

  /**
   * Check if admin category name is unique globally
   */
  async isAdminCategoryNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const query: any = { name, createdType: "ADMIN" };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await SkillCategory.countDocuments(query);
    return count === 0;
  }

  /**
   * Check if company category name is unique within company
   */
  async isCompanyCategoryNameUnique(name: string, companyId: string, excludeId?: string): Promise<boolean> {
    const query: any = { name, createdType: "COMPANY", companyId };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await SkillCategory.countDocuments(query);
    return count === 0;
  }

  /**
   * Find categories with custom query
   */
  async find(query: any, skip: number = 0, limit: number = 10): Promise<ISkillCategory[]> {
    return SkillCategory.find(query)
      .lean()  // Return plain JavaScript objects instead of Mongoose documents
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }
}

export default new SkillCategoryRepository();
